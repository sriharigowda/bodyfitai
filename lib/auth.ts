import { supabase } from './supabase'

export async function sendOTP(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,
            emailRedirectTo:  undefined,  // disable magic link redirect
        },
    })
    return { error: error?.message ?? null }
}

export async function verifyOTP(email: string, token: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
    })
    return { error: error?.message ?? null }
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function signOut() {
    await supabase.auth.signOut()
}