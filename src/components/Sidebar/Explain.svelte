<script lang="ts">
  import { getContext } from "svelte";
  import type { App } from "src/types";
  import { code } from "@data";

  let ctx: App = getContext("app");
  let explanation = $state("");
  let loading = $state(false);
  let apiKey = $state(localStorage.getItem("hackclub-ai-key") || "");

  async function explainCode() {
    if (!ctx.openModule || loading) return;

    const moduleCode = code.get(ctx.openModule);
    if (!moduleCode) {
      explanation = "No code found for the current module.";
      return;
    }

    loading = true;
    explanation = "";

    try {
      const response = await fetch(
        "https://proxy.felix.hackclub.app/https://ai.hackclub.com/proxy/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "qwen/qwen3-32b",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that explains JavaScript code clearly and concisely in plaintext (markdown not supported).",
              },
              {
                role: "user",
                content: `Explain what this webpack module does:\n\n${moduleCode}`,
              },
            ],
            stream: true,
          }),
        },
      );

      if (!response.ok)
        throw new Error(`API error: ${response.status} ${response.statusText}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No readable stream available");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) explanation += content;
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      explanation = `Error: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      loading = false;
    }
  }
</script>

<div class="explain">
  {#if !ctx.openModule}
    <div class="empty">Select a file to explain</div>
  {:else}
    <div class="module-name">{ctx.openModule}</div>

    <input
      type="password"
      placeholder="Hack Club AI API Key"
      bind:value={apiKey}
      oninput={(e) => localStorage.setItem("hackclub-ai-key", apiKey)}
    />

    <a href="https://ai.hackclub.com/keys" target="_blank" class="key-link"
      >Get API Key</a
    >

    <button
      class="explain-button"
      onclick={explainCode}
      disabled={loading || !apiKey}
    >
      {#if loading}
        <span class="spinner"></span>
        Explaining...
      {:else}
        Explain Code
      {/if}
    </button>

    {#if explanation}
      <div class="explanation">{explanation}</div>
    {/if}
  {/if}
</div>

<style>
  .explain {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty {
    color: var(--text-muted);
    font-size: 12px;
    padding: 8px;
  }

  .module-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  input {
    width: 100%;
    padding: 6px 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-size: 11px;
    outline: none;
    box-sizing: border-box;
  }

  .explain-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .explain-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .explanation {
    padding: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text);
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .key-link {
    font-size: 11px;
    color: var(--accent);
    text-decoration: none;
    text-align: center;
  }

  .key-link:hover {
    text-decoration: underline;
  }
</style>
