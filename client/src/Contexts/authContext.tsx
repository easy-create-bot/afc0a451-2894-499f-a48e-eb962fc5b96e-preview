/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from "react"
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { supabase, supabaseAs } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL;

interface OnboardingState {
    projects_viewed: boolean,
    add_project_viewed: boolean,
    link_github_viewed: boolean;
    specific_model_viewed: boolean,
    add_user_viewed: boolean,
    chat_sent: boolean,
}

interface AuthState {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    role: string,
    accessToken: string,
    hasGithubToken: boolean,
    subscription: string | null,
    count: number | null,
    onboarding_state: OnboardingState | null
}

interface AuthContextType {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    role: string,
    accessToken: string,
    hasGithubToken: boolean,
    subscription: string | null,
    count: number | null,
    loading: boolean,
    onboarding_state: OnboardingState | null,
    signup: (token: string | null, firstName: string, lastName: string, email: string, password: string, role: string, company: string | null, setAuthError: React.Dispatch<React.SetStateAction<string | null>>) => Promise<void>,
    login: (token: string | null, email: string, password: string, setAuthError: React.Dispatch<React.SetStateAction<string | null>>) => Promise<void>,
    logout: () => void,
    setCount: (count: number | null) => void,
    setOnboardingState: (value: keyof OnboardingState, state: boolean) => void,
}

export const AuthContext = createContext<AuthContextType>({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    accessToken: "",
    hasGithubToken: false,
    subscription: null,
    count: null,
    loading: true,
    onboarding_state: null,
    signup: async () => {
        throw new Error("signup function not implemented")
    },
    login: async () => {
        throw new Error("login function not implemented")
    },
    logout: () => {
        throw new Error("logout function not implemented")
    },
    setCount: () => {
        throw new Error("setCount function not implemented")
    },
    setOnboardingState: async () => {
        throw new Error("setOnboardingState function not implemented")
    }
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    const [auth, setAuth] = useState<AuthState>({
        id: "",
        firstName: "",
        lastName: "",
        email: "",
        role: "",
        accessToken: "",
        hasGithubToken: false,
        subscription: null,
        count: null,
        onboarding_state: null
    })
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
            if (session) {
                try {
                    const { data: user, error } = await supabase.auth.getUser(session.access_token)
                    if (error || !user?.user) {
                        console.log(error)
                        return
                    }

                    const signupRole = sessionStorage.getItem('signup_role')
                    if (signupRole) {
                        const signupResponse = await axios.post(`${API_URL}/auth/oauth/signup`, {
                            role: signupRole
                        }, { headers: { Authorization: `Bearer ${session.access_token}` } })

                        const { newUser, count } = signupResponse.data
                        setAuth(newUser)
                        if (count) {
                            setCount(count)
                        }
                        sessionStorage.removeItem('signup_role')
                        return
                    }

                    const res = await axios.get(`${API_URL}/auth/user-exists/${user.user.email}`)
                    const { message } = res.data
                    if (message === "User does not exist") {
                        navigate('/signup?oauth_failed=true')
                        return
                    }

                    const response = await axios.get(`${API_URL}/auth/${session.user.id}`, {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`
                        }
                    })

                    const data = response.data
                    setAuth({
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        role: data.role,
                        accessToken: session.access_token,
                        hasGithubToken: data.hasGithubToken,
                        id: session.user.id,
                        subscription: data.subscription,
                        count: data.count,
                        onboarding_state: data.onboarding_state
                    });
                } catch (error) {
                    console.error(error)
                    await supabase.auth.signOut();
                } finally {
                    setLoading(false);
                }
            } else {
                setAuth({
                    id: "",
                    firstName: "",
                    lastName: "",
                    email: "",
                    role: "",
                    accessToken: "",
                    hasGithubToken: false,
                    subscription: null,
                    count: null,
                    onboarding_state: null
                });
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const setCount = (count: number | null) => {
        setAuth({
            ...auth,
            count: count
        })
    }

    const signup = async (token: string | null, firstName: string, lastName: string, email: string, password: string, role: string, company: string | null, setAuthError: React.Dispatch<React.SetStateAction<string | null>>) => {
        try {
            await axios.post(`${API_URL}/auth/signup`, {
                firstName,
                lastName,
                userEmail: email,
                password: password,
                userRole: role,
                company: company,
                token: token
            })

            navigate('/login');
        } catch (error) {
            if (error instanceof AxiosError) {
                setAuthError(error.response?.data.message || "Failed to sign up");
            }
            return;
        }
    }

    const login = async (token: string | null, email: string, password: string, setAuthError: React.Dispatch<React.SetStateAction<string | null>>) => {
        const { data: user, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setAuthError(error.message || "Failed to login");
            return;
        }

        if (token) {
            const { data, error: findInviteError } = await supabase.from("project_invites").select("*").eq("hashed_token", token).single()
            if (findInviteError) {
                setAuthError(findInviteError.message || "Failed to login");
                return;
            }

            await axios.post(`${API_URL}/project/${data.project_id}/add-user`, { userEmail: email, token }, {
                headers: {
                    Authorization: `Bearer ${user.session.access_token}`
                }
            })
        }
        navigate("/dashboard");
    }

    const logout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    }

    const setOnboardingState = async (value: keyof OnboardingState, state: boolean) => {

        const sb = supabaseAs(auth.accessToken)
        if (!auth.onboarding_state) {
            return
        }
        const oldOnboardingState = auth.onboarding_state
        const newOnboardingState = { ...auth.onboarding_state, [value]: state }
        setAuth({ ...auth, onboarding_state: newOnboardingState })

        const { error } = await sb.from('users').select('*').single()

        if (error) {
            setAuth({ ...auth, onboarding_state: oldOnboardingState })
            return
        }

        const { error: updateError } = await sb.from('users').update({ onboarding_state: newOnboardingState }).eq('id', auth.id)

        if (updateError) {
            setAuth({ ...auth, onboarding_state: oldOnboardingState })
            return
        }
    }

    const value = {
        ...auth,
        loading,
        signup,
        login,
        logout,
        setCount,
        setOnboardingState
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}