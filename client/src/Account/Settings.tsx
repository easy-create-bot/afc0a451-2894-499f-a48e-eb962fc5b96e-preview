import Navbar from "../Navbar/navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { useAuth } from "../Contexts/authContext"
import axios from "axios"
import { useState } from "react"

const API_URL = import.meta.env.VITE_API_URL

export default function Settings() {
    const { firstName, lastName, email, subscription, accessToken } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const fullName = [firstName, lastName].filter(Boolean).join(" ")

    const handleCancelSubscription = async () => {
        try {
            setIsSubmitting(true)
            await axios.post(
                `${API_URL}/payment/cancel-subscription`,
                {},
                { headers: { Authorization: `Bearer ${accessToken}` } }
            )
        } catch {
            // swallow error per simplicity; can add toast later
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="main-background min-h-screen flex flex-col">
            <Navbar />
            <main className="container mx-auto px-4 py-6">
                <Card className="card border-transparent select-trigger">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-header text-white">Account Settings</CardTitle>
                        <CardDescription className="text-md sm:text-lg font-regular text-white">Manage your account information and subscription</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-md font-regular text-white">Name</p>
                            <p className="text-base font-text text-white">{fullName || "—"}</p>
                        </div>
                        <div>
                            <p className="text-md font-regular text-white">Email</p>
                            <p className="text-base font-text text-white">{email || "—"}</p>
                        </div>
                        <div>
                            <p className="text-md font-regular text-white">Subscription</p>
                            <p className="text-base font-text text-white">{subscription ?? "None"}</p>
                        </div>
                        <div className="pt-2">
                            <Button
                                variant="outline"
                                className="cursor-pointer bg-[#1d102a] border-transparent shadow-sm shadow-black/50 hover:bg-[#1d102a] font-regular font-bold text-white"
                                onClick={handleCancelSubscription}
                                disabled={!subscription || isSubmitting}
                            >
                                Cancel subscription
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}