import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://odzeffikhrwliyiteigl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kemVmZmlraHJ3bGl5aXRlaWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzA3NzEsImV4cCI6MjA4ODA0Njc3MX0.UPMC8KdA7HTPIGpm7MH37m3y8rpgv8coFt0ylugPu4Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
