import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibzcyatlycxxyecczmqw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliemN5YXRseWN4eHllY2N6bXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTY1MzksImV4cCI6MjA4NzkzMjUzOX0.sRV8j3xTxzl4dYv482XdxwsQyveYTdcc5RPMXi9OKAI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
