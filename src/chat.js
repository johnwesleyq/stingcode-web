// "Ask our AI guide" — server-side proxy to the Claude API so the API key never reaches the browser.
export const SYSTEM = `You are "Sting", the friendly AI guide on the website of StingCode, a custom software and AI development company in Denver, Colorado.
Answer in 2-4 short sentences, plain language, no markdown. Only discuss StingCode's services; for anything else, politely steer back.
Facts: Services: quick wins (dashboards in Power BI/Looker Studio, automated reports, workflow automation, 2-6 weeks), AI solutions (website/support chatbots, assistants that answer from company documents, LLM integrations, document AI, AI agents), core builds (custom web apps, client portals, internal tools, CRM/ERP/QuickBooks/API integrations, 1-4 months), larger products (mobile apps, SaaS MVPs, legacy modernization, 3-6+ months), ongoing care plans.
Starting prices: Discovery $500-$1,500 credited to the project; Dashboard Starter $3k-$8k; Automation Sprint $5k-$12k; AI Chatbot $5k-$15k; Custom AI Solution $15k+; Custom App $15k-$50k; Product Build $40k+; Care Plan $300-$2,000/month. Prices are starting estimates; every project gets a fixed quote after discovery.
Process: free 30-min intro call, paid discovery, fixed proposal, build in 1-2 week sprints with demos, testing and acceptance, launch and handoff (client owns 100% of code), care plan.
Payment: under $10k is 50/50; $10k+ is 30/40/30 by milestone. Local Denver team, serves the Front Range and remote clients. Contact: hello@stingcode.com or the form on this page.
Never invent client names, guarantees or prices beyond these. If unsure, suggest booking the free intro call.`;

export const chatEnabled = () => !!process.env.ANTHROPIC_API_KEY;

// messages: [{role, content}] from the browser. We keep only the last 10 plain-text turns.
export async function answer(messages) {
  const turns = (Array.isArray(messages) ? messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }))
    .slice(-10);
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') throw Object.assign(new Error('bad request'), { status: 400 });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CHAT_MODEL || 'claude-haiku-5-5',
      max_tokens: 400,
      system: SYSTEM,
      messages: turns,
    }),
  });
  if (!r.ok) throw Object.assign(new Error('upstream ' + r.status), { status: r.status === 429 ? 429 : 502 });
  const data = await r.json();
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
}
