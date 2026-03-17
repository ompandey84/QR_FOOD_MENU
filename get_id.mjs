import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getRestaurant() {
    const { data, error } = await supabase.from('restaurants').select('id').limit(1).single();
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("RESTAURANT_ID=" + data.id);
    }
}
getRestaurant();
