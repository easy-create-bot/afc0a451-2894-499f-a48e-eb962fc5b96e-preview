import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase";
import gmailIcon from '../assets/gmail.png'

export function GoogleSignInButton() {
    const signIn = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}` }
        })
    }
    return <Button variant="outline" className="cursor-pointer w-full shadow-md" onClick={signIn}>Continue with Google <img src={gmailIcon} className="h-[95%] object-contain" /></Button>
}

export function GoogleSignUpButton({ role }: { role: string }) {
    const signIn = async () => {

        sessionStorage.setItem('signup_role', role)
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}` }
        })
    }
    return <Button variant="outline" className="cursor-pointer w-full shadow-md" onClick={signIn}>Signup with Google <img src={gmailIcon} className="h-[95%] object-contain" /></Button>
}