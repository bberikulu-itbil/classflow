import { createClient } from '@supabase/supabase-js';

export const CF = {
  url: 'https://tsaqxuutacgbeaaqzivv.supabase.co',
  key: 'sb_publishable_X1YnKHhoBgRMr-hFxN7zWA_lgvKIgL5',
  emailDomain: 'users.lyceum-life.app',
};

export const sb = createClient(CF.url, CF.key);
export const STAFF = ['teacher', 'class_teacher', 'deputy', 'admin'];

// ?demo=teacher|student runs the homework screens on in-memory data, without logging in
export const DEMO = new URLSearchParams(window.location.search).get('demo');
