import { useAuth } from "../Contexts/authContext"
import { useNavigate } from "react-router-dom"
import logo from "../assets/logo.png"
import { Link } from "react-router-dom"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu"
import { Button } from "../components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { LogOut, Settings, User } from "lucide-react"
import { useEffect, useState } from "react"
import githubIcon from '../assets/github.png';

export default function Navbar() {
    const navigate = useNavigate()
    const { firstName, lastName, email, logout, subscription, hasGithubToken, accessToken } = useAuth()
    const user: {
        name: string
        email: string
        avatar?: string
    } | null = ((email && email.length > 0) ? {
        name: firstName.charAt(0).toUpperCase() + firstName.slice(1) + " " + lastName.charAt(0).toUpperCase() + lastName.slice(1), email: email, avatar: "/placeholder.svg?height=32&width=32"
    } : null)

    const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 330)

    const changeWidth = () => {
        setIsDesktop(window.innerWidth >= 330)
    }
    useEffect(() => {
        window.addEventListener('resize', changeWidth)

        return () => {
            window.removeEventListener('resize', changeWidth)
        }
    }, [])

    const handleLogout = () => {
        logout()
    }

    const getSubscriptionName = (tier: number) => {
        switch (tier) {
            case 1:
                return "Core"
            case 2:
                return "Scale"
            case 3:
                return "Enterprise"
            default:
                return ""
        }
    }

    return <div className="mx-auto w-[95%] sm:w-[80%] flex flex-row items-center p-2 px-4 mt-2 navbar text-white">
        {(isDesktop) && <div onClick={() => navigate("/")} className="cursor-pointer">
            <img src={logo} alt="TicketRelay" className="h-6 sm:h-10 xl:h-12 w-full" />
        </div>}
        <div className="flex flex-row gap-4 px-2 md:px-6 items-center">
            <Link to="/dashboard" className="font-text text-sm sm:text-md xl:text-lg text-gray-100">
                Dashboard
            </Link>
        </div>
        <div className="flex items-center ml-auto">
            {user ? (
                // Logged in - show avatar with dropdown
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full cursor-pointer">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                                <AvatarFallback className="text-black">
                                    {user.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                {subscription && <p className="text-xs leading-none text-muted-foreground">{getSubscriptionName(parseInt(subscription.split(" ")[1]))}</p>}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {hasGithubToken ? <DropdownMenuItem>
                            <img src={githubIcon} className="mr-2 h-4 w-4" />
                            <span>Github Linked</span>
                        </DropdownMenuItem> : <DropdownMenuItem onClick={() => window.open(`https://github.com/login/oauth/authorize?client_id=Ov23liYl4wln6vn4lhhX&scope=repo&state=${accessToken}`)} className="cursor-pointer">
                            <img src={githubIcon} className="mr-2 h-4 w-4" />
                            <span>Link Github</span>
                        </DropdownMenuItem>}


                        <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                // Not logged in - show login button
                <Button onClick={() => navigate("/login")} variant="default" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Login
                </Button>
            )}
        </div>
    </div>
}