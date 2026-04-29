import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders(),
    })
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return json({ error: 'Missing OPENAI_API_KEY' }, 500)
    }

    const { systemPrompt, userContent, maxTokens, json: wantsJson } = await req.json()

    const openAiRes = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: maxTokens ?? 1400,
      }),
    })

    const body = await openAiRes.json()
    if (!openAiRes.ok) {
      const message = body?.error?.message ?? 'OpenAI request failed'
      return json({ error: message }, openAiRes.status)
    }

    const content = body?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      return json({ error: 'Empty AI response' }, 502)
    }

    if (wantsJson) {
      return json(JSON.parse(content), 200)
    }

    return json({ text: content.trim() }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected edge error'
    return json({ error: message }, 500)
  }
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(),
  })
}
