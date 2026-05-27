const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Node.js < 22 ไม่มี native WebSocket — ต้องส่ง ws package ให้ Supabase realtime
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://xayrkudijixhwsdbakpp.supabase.co',
  process.env.SUPABASE_SERVICE_KEY,
  {
    realtime: {
      transport: ws,
    },
  }
);

module.exports = supabase;
