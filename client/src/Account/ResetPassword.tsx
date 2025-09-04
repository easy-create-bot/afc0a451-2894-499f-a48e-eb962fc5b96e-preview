import axios from "axios"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import AuthError from "../Errors/AuthError"

const API_URL = import.meta.env.VITE_API_URL;

export default function ResetPassword() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const navigate = useNavigate()
    useEffect(() => {
        const token = new URLSearchParams(window.location.search).get("token")
        if (!token) {
            setError("Invalid token")
            return
        }
    }, [])

    const handleResetPassword = async () => {
        const token = new URLSearchParams(window.location.search).get("token")
        if (!token) {
            setError("Invalid token")
            return
        }
        if (!password || !confirmPassword) {
            setError("Please fill in both fields")
            return
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setIsSubmitting(true)
        try {
            await axios.post(`${API_URL}/auth/forgot-password/${token}`, {
                password
            })
            navigate("/login")
        } catch (error) {
            console.error(error)
            setError("Failed to reset password")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center main-background px-4">
            <Card className="w-full max-w-md card border-transparent">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center text-white font-header">Reset password</CardTitle>
                    <CardDescription className="text-center text-white font-regular">Enter your new password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="font-regular text-white font-bold">New Password</Label>
                        <Input
                            id="password"
                            className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                            type="password"
                            placeholder="Enter your new password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="font-regular text-white font-bold">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                            type="password"
                            placeholder="Confirm your password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                        />
                    </div>
                    <Button
                        className="w-full h-full bg-[#1d102a] cursor-pointer shadow-sm shadow-black/50 hover:bg-[#1d102a] font-regular font-bold"
                        type="submit"
                        onClick={handleResetPassword}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Resetting..." : "Reset Password"}
                    </Button>
                </CardContent>
                <CardFooter>
                    <div className="text-sm text-center text-white font-text w-full">
                        Remembered your password? {" "}
                        <Link to="/login" className=" hover:underline font-medium">
                            Sign in
                        </Link>
                    </div>
                </CardFooter>
            </Card>

            {error && <AuthError error={error} setAuthError={setError} />}
        </div>
    )
}