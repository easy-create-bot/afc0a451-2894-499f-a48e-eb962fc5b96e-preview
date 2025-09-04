import Navbar from "../Navbar/navbar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { useAuth } from "../Contexts/authContext"
import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL

export default function JoinProject() {
    const { email, accessToken } = useAuth()
    const [open, setOpen] = useState(true)
    const [userEmail, setUserEmail] = useState("")
    const { projectId } = useParams()
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")

    const navigate = useNavigate()

    useEffect(() => {
        if (!email) return
        setUserEmail(email)
    }, [email])

    const isSignedIn = !!email

    const handleJoin = async () => {
        if (!token) {
            console.log("No token found")
            navigate("/")
            return
        }

        if (isSignedIn) {
            try {
                await axios.post(`${API_URL}/project/${projectId}/add-user`, { userEmail, token }, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                })
            } catch (error) {
                console.error(error)
            }
            navigate("/dashboard")
            setOpen(false)
            return
        }

        const res = await axios.get(`${API_URL}/auth/user-exists/${userEmail}`)
        const { message } = res.data

        if (message != "User does not exist") {
            navigate(`/login?token=${token}&email=${userEmail}`)
            return
        } else {
            navigate(`/signup?token=${token}&email=${userEmail}`)
            return
        }
    }

    return (
        <div className="main-background flex flex-col min-h-screen">
            <Navbar />
            <Dialog open={open}>
                <DialogContent className="max-w-md border-0 main-background">
                    <DialogHeader>
                        <DialogTitle className="text-white">Join Project</DialogTitle>
                        <DialogDescription className="text-[rgb(224,224,224)]">
                            {isSignedIn ? "You are already signed in" : "Enter your email to join the project"}
                        </DialogDescription>
                    </DialogHeader>

                    {!isSignedIn && (
                        <div className="space-y-2">
                            <label className="text-white mb-1 text-sm text-regular font-semibold" htmlFor="email">Email</label>
                            <Input
                                id="email"
                                type="email"
                                className="bg-[#1d102a] text-white border-0 focus-visible:ring-0 select-trigger"
                                placeholder="you@example.com"
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button className="cursor-pointer bg-[#1d102a] select-trigger" onClick={handleJoin} disabled={!isSignedIn && !userEmail}>Join Project</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}