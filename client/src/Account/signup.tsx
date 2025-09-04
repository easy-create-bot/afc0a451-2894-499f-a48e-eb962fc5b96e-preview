/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group"
import { Badge } from "../components/ui/badge"
import { Code, User } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { useAuth } from "../Contexts/authContext"
import AuthError from "../Errors/AuthError"
import { GoogleSignUpButton } from "./GoogleSignIn"

export default function Signup() {
    const { signup } = useAuth()
    const [selectedRole, setSelectedRole] = useState("developer")
    const [signupData, setSignupData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        company: "",
    })
    const [authError, setAuthError] = useState<string | null>(null)
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")
    const email = searchParams.get("email")

    useEffect(() => {
        if (token && email) {
            setSignupData({ ...signupData, email: email })
        }
    }, [token, email])

    useEffect(() => {
        const oauth_failed = searchParams.get('oauth_failed')
        if (oauth_failed) {
            setAuthError("Please signup with gmail here")
            return
        }
    }, [searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center main-background px-4 py-8">
            <Card className="w-full max-w-md card border-transparent">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center text-white font-header">Create account</CardTitle>
                    <CardDescription className="text-center text-white font-regular">Choose your account type and enter your details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Role Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-bold text-white font-regular">Account Type</Label>
                        <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                                    value="user"
                                    id="user"
                                />
                                <Label
                                    htmlFor="user"
                                    className="flex items-center space-x-2 cursor-pointer bg-[#1d102a] flex-1 p-3 rounded-lg shadow-[#2f2e2d] shadow-sm"
                                >
                                    <User className="h-4 w-4" color='white' />
                                    <div>
                                        <div className="font-medium text-white font-regular">User</div>
                                        <div className="text-xs text-muted-foreground font-text">Regular user account</div>
                                    </div>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black" value="developer" id="developer" />
                                <Label
                                    htmlFor="developer"
                                    className="flex items-center space-x-2 cursor-pointer bg-[#1d102a] flex-1 p-3 rounded-lg shadow-[#2f2e2d] shadow-sm"
                                >
                                    <Code className="h-4 w-4" color='white' />
                                    <div>
                                        <div className="font-medium text-white font-regular">Developer</div>
                                        <div className="text-xs text-muted-foreground font-text">Developer account</div>
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                        {selectedRole && (
                            <div className="flex justify-center">
                                <Badge className="bg-[#1d102a] text-white px-2 py-1 shadow-[#2f2e2d] shadow-sm">
                                    {selectedRole === "developer" ? "Developer Account" : "User Account"}
                                </Badge>
                            </div>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="font-regular text-white font-bold">First Name</Label>
                                <Input id="firstName"
                                    className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                                    placeholder="John" required value={signupData.firstName} onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="font-regular text-white font-bold">Last Name</Label>
                                <Input id="lastName"
                                    className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                                    placeholder="Doe" required value={signupData.lastName} onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="font-regular text-white font-bold">Email</Label>
                            <Input id="email"
                                className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                                type="email" placeholder="john.doe@example.com" required value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} />
                        </div>

                        <div className="space-y-2 font-regular text-white font-bold" >
                            <Label htmlFor="password">Password</Label>
                            <Input id="password"
                                className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                                type="password" placeholder="Create a strong password" required value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} />
                        </div>

                        <div className="space-y-2 font-regular text-white font-bold">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input onKeyDown={(e) => e.key === 'Enter' && signup(token || null, signupData.firstName, signupData.lastName, signupData.email, signupData.password, selectedRole, signupData.company, setAuthError)}
                                className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                                id="confirmPassword" type="password" placeholder="Confirm your password" required value={signupData.confirmPassword} onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })} />
                        </div>

                        {selectedRole === "developer" && (
                            <div className="space-y-2 ">
                                <Label htmlFor="company" className="font-regular text-white font-bold">Company/Organization (Optional)</Label>
                                <Input id="company"
                                    className="border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                                    placeholder="Your company name" value={signupData.company} onChange={(e) => setSignupData({ ...signupData, company: e.target.value })} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Button className="w-full bg-[#1d102a] cursor-pointer shadow-sm shadow-black/50 hover:bg-[#1d102a] font-regular font-bold" type="submit" onClick={() => signup(token || null, signupData.firstName, signupData.lastName, signupData.email, signupData.password, selectedRole, signupData.company, setAuthError)}>
                            Create Account
                        </Button>
                        <GoogleSignUpButton role={selectedRole} />
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="text-sm text-center text-white font-text w-full">
                        Already have an account?{" "}
                        <Link to="/login" className=" hover:underline font-medium">
                            Sign in
                        </Link>
                    </div>
                </CardFooter>
            </Card>

            {authError && <AuthError error={authError} setAuthError={setAuthError} />}
        </div>
    )
}
