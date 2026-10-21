// Adds example records (marked "Sample") so the back office isn't empty on day one.
// Remove them anytime with the "Remove sample data" button on the dashboard.
import 'dotenv/config';
import * as store from '../src/db.js';

const clients = [
  ['c-sample-1', { company: 'Front Range Plumbing (sample)', name: 'Dana Ortiz', email: 'dana@example.com', phone: '303-555-0141', industry: 'Home services', carePlan: 600, status: 'Active', notes: 'Job-costing dashboard client.' }],
  ['c-sample-2', { company: 'Mile High Dental Group (sample)', name: 'Priya Shah', email: 'priya@example.com', phone: '720-555-0188', industry: 'Healthcare', carePlan: 0, status: 'Active', notes: 'Patient FAQ chatbot.' }],
  ['c-sample-3', { company: 'Boulder Brewing Supply (sample)', name: 'Marcus Lee', email: 'marcus@example.com', phone: '303-555-0177', industry: 'Retail', carePlan: 900, status: 'Active', notes: 'Inventory app.' }],
];
const projects = [
  ['p-sample-1', { name: 'Job-costing dashboard', clientId: 'c-sample-1', clientName: 'Front Range Plumbing (sample)', package: 'Dashboard Starter', status: 'Testing', value: 6500, progress: 80, due: '2026-10-30' }],
  ['p-sample-2', { name: 'Patient FAQ chatbot', clientId: 'c-sample-2', clientName: 'Mile High Dental Group (sample)', package: 'AI Chatbot', status: 'Building', value: 9000, progress: 45, due: '2026-11-20' }],
  ['p-sample-3', { name: 'Inventory & reorder app', clientId: 'c-sample-3', clientName: 'Boulder Brewing Supply (sample)', package: 'Custom App', status: 'Launched', value: 24000, progress: 100, due: '2026-09-25' }],
];
const leads = [
  ['l-sample-1', { name: 'Tom Becker', company: 'Aurora Logistics (sample)', email: 'tom@example.com', service: 'Automation Sprint', value: 8000, stage: 'Proposal', source: 'Referral', notes: 'Wants dispatch reports automated.' }],
  ['l-sample-2', { name: 'Elena Ruiz', company: 'Golden Property Mgmt (sample)', email: 'elena@example.com', service: 'Custom AI Solution', value: 18000, stage: 'Discovery', source: 'Website', notes: 'AI assistant over lease documents.' }],
  ['l-sample-3', { name: 'Sam Nguyen', company: 'Lakewood Fitness (sample)', email: 'sam@example.com', service: 'Dashboard Starter', value: 5000, stage: 'New', source: 'LinkedIn' }],
  ['l-sample-4', { name: 'Rachel Kim', company: 'Castle Rock CPA (sample)', email: 'rachel@example.com', service: 'Discovery', value: 2500, stage: 'Contacted', source: 'Chamber event' }],
  ['l-sample-5', { name: 'Dana Ortiz', company: 'Front Range Plumbing (sample)', email: 'dana@example.com', service: 'Dashboard Starter', value: 6500, stage: 'Won', source: 'Website' }],
];
const inquiries = [
  ['i-sample-1', { name: 'Chris Walker', company: 'Englewood Auto Glass (sample)', email: 'chris@example.com', service: 'AI Chatbot', budget: '$5k–$15k', timeline: '1–3 months', message: 'Want a chatbot that books appointments.', handled: false }],
];

let n = 0;
for (const [table, rows] of Object.entries({ clients, projects, leads, inquiries })) {
  for (const [id, data] of rows) {
    if (store.get(table, id)) continue;
    store.create(table, { ...data, sample: true }, id); n++;
  }
}
console.log(n ? `Added ${n} sample records.` : 'Sample records already present.');
