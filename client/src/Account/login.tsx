/* eslint-disable react-hooks/exhaustive-deps */
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { useAuth } from "../Contexts/authContext"
import { useEffect, useState } from "react"
import AuthError from "../Errors/AuthError"
import { GoogleSignInButton } from "./GoogleSignIn"
import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL;

export default function Login() {
    const { login } = useAuth()
    const [loginData, setLoginData] = useState({
        email: "",
        password: ""
    })
    const [authError, setAuthError] = useState<string | null>(null)
    const [infoMessage, setInfoMessage] = useState<string | null>(null)
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")
    const email = searchParams.get("email")

    useEffect(() => {
        if (token && email) {
            setLoginData({ ...loginData, email: email })
        }
    }, [token, email])

    const handleForgotPassword = async () => {
        if (!loginData.email) {
            setAuthError("Please enter your email")
            return
        }

        try {
            await axios.post(`${API_URL}/auth/forgot-password`, { email: loginData.email })
            setAuthError(null)
            setInfoMessage("Password reset email sent. Check your inbox.")
        } catch {
            setAuthError("Failed to send forgot password email")
        }
    }

    return (
        <div className="min-h-screen main-background flex items-center justify-center px-4">
            <Card className="w-full max-w-md card border-transparent">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center text-white font-header">Welcome back</CardTitle>
                    <CardDescription className="text-center text-white font-regular">Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="font-regular text-white font-bold">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                            placeholder="Enter your email"
                            required value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="font-regular text-white font-bold">Password</Label>
                        <Input
                            onKeyDown={(e) => e.key === 'Enter' && login(token || null, loginData.email, loginData.password, setAuthError)}
                            id="password"
                            className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                            type="password"
                            placeholder="Enter your password"
                            required value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        />
                    </div>
                    <Button className="w-full h-full bg-[#1d102a] cursor-pointer shadow-sm shadow-black/50 hover:bg-[#1d102a] font-regular font-bold" type="submit" onClick={() => login(token || null, loginData.email, loginData.password, setAuthError)}>
                        Sign In
                    </Button>
                    <GoogleSignInButton />
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    {infoMessage && (
                        <div className="text-sm text-center text-green-400 font-text">
                            {infoMessage}
                        </div>
                    )}
                    <div className="text-sm text-center text-muted-foreground">
                        <Button variant='link' className="underline text-white cursor-pointer" onClick={handleForgotPassword}>
                            Forgot your password?
                        </Button>
                    </div>
                    <div className="text-sm text-center text-white font-text">
                        {"Don't have an account? "}
                        <Link to="/signup" className=" hover:underline font-medium">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
            </Card>

            {authError && <AuthError error={authError} setAuthError={setAuthError} />}
        </div>
    )
}
