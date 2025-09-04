import { Card, CardContent } from "../components/ui/card"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "../components/ui/button"
import { useEffect, useState } from "react"
import { BadgeQuestionMark, BotIcon, GitPullRequest, SquareChartGantt } from "lucide-react"
import { useAuth } from "../Contexts/authContext"
import axios from "axios"
import agentDemo from '../assets/demos/agent.png'
import projectsDemo from '../assets/demos/projects.png'
import aiAgentDemo from '../assets/demos/ai_agent.png'
import chatsDemo from '../assets/demos/chats.png'
import modelsDemo from '../assets/demos/models.png'
import { supabase } from "../lib/supabase"
import Navbar from "../Navbar/navbar"
const API_URL = import.meta.env.VITE_API_URL

export function Home() {
    const [searchParams] = useSearchParams()

    useEffect(() => {
        const github_callback = searchParams.get('github')
        const access_token = searchParams.get('access_token')

        if (github_callback === 'true' && access_token) {
            async function handleGitHubCallback() {
                try {
                    const { error } = await supabase.auth.setSession({
                        access_token: access_token!,
                        refresh_token: access_token!
                    })

                    if (error) {
                        console.error('Error setting session:', error)
                        return
                    }

                    window.history.replaceState({}, document.title, window.location.pathname)
                } catch (error) {
                    console.error('Error handling GitHub callback:', error)
                }
            }

            handleGitHubCallback()
        }
    }, [searchParams])

    useEffect(() => {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (!access_token || !refresh_token) {
            return
        }

        async function handleAuth() {
            try {
                const { error } = await supabase.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! })
                if (error) {
                    return
                }
            } catch (error) {
                console.log(error)
            }
        }

        handleAuth()
    }, [])

    return <div className="main-background min-h-screen flex flex-col">
        <Navbar />
        <div className="mt-6 md:min-h-screen flex flex-col flex-grow">
            <Header />
        </div>
        <div className="mt-24 md:mt-0 flex flex-col mb-12 space-y-30">
            <Features />
            <Subscriptions />
        </div>
    </div>
}

function Header() {
    const navigate = useNavigate()
    const { email } = useAuth()
    return <header className="flex flex-col w-[90%] text-white self-center items-center px-4">
        <h3 className="font-header text-3xl md:text-5xl lg:text-8xl xl:text-9xl">TicketRelay</h3>
        <p className="font-regular text-lg md:text-xl lg:text-4xl xl:text-5xl text-center">Bridge Clients and Developers with AI-Powered Issue and Feature Management</p>
        <div className="flex flex-row mt-4 md:mt-8 space-x-4">
            <Button onClick={() => window.open('https://www.youtube.com/watch?v=jlQ7guwZr6k')} className="cursor-pointer px-4 py-2 text-md lg:text-lg xl:text-xl bg-[#1b0f27] hover:bg-[#1b0f27] font-header font-semibold shadow-[#2f2e2d] shadow-sm">
                View Demo
            </Button>
            <Button onClick={() => {
                if (email.length > 0) {
                    navigate('/dashboard')
                } else {
                    navigate('/login')
                }
            }} className="cursor-pointer px-4 py-2 text-md lg:text-lg xl:text-xl bg-[#1b0f27] hover:bg-[#1b0f27] font-header font-semibold shadow-[#2f2e2d] shadow-sm">
                Try Now
            </Button>
        </div>
        <img src={agentDemo} className="max-w-xs sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mt-6 object-contain" />
    </header>
}

const features = [
    { img: aiAgentDemo, title: 'AI-Powered Pull Requests', description: "Turn client requests into code instantly. Our agent generates pull requests for bugs and features automatically and you stay in control with one click approval." },
    { img: projectsDemo, title: 'Collaborative Project Spaces', description: "Invite clients with just their email and keep everything organized in one place. Manage projects, track updates, and view all chats in a simple dashboard." },
    { img: chatsDemo, title: 'Smart Chat History', description: "Never lose track of what matters. Filter conversations by status such as created, pending, seen, or by date and email so you always know where a request stands." },
    { img: modelsDemo, title: 'Multi Model Support', description: "Choose the AI that fits your workflow. Whether it is ChatGPT, Gemini, or other models, TicketRelay adapts to deliver agentic code changes with precision." }
]

function Features() {
    const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 768)

    const changeWidth = () => {
        setIsDesktop(window.innerWidth >= 768)
    }
    useEffect(() => {
        window.addEventListener('resize', changeWidth)

        return () => {
            window.removeEventListener('resize', changeWidth)
        }
    }, [])

    return <section>
        <div className="flex flex-col items-center space-y-4 md:space-y-8">
            <p className="text-3xl sm:text-4xl md::text-5xl xl:text-6xl text-white font-header">Features</p>
            {isDesktop ?
                <div className="w-[95%] lg:w-[85%] ">
                    <div className="flex flex-row justify-center gap-4">
                        <FeatureCard feature={features[0]} />
                        <FeatureCard feature={features[1]} />
                    </div>
                    <div className="flex flex-row justify-center gap-4 mt-4">
                        <FeatureCard feature={features[2]} />
                        <FeatureCard feature={features[3]} />
                    </div>
                </div> : <div className="flex flex-col items-center justify-center space-y-4">
                    <FeatureCard feature={features[0]} />
                    <FeatureCard feature={features[1]} />
                    <FeatureCard feature={features[2]} />
                    <FeatureCard feature={features[3]} />
                </div>}
        </div>
    </section>
}

function FeatureCard({ feature }: { feature: { img: string, title: string, description: string } }) {
    return <Card className="min-h-[350px] w-[300px] md:w-[325px] lg:w-[400px] xl:w-[500px] p-0 rounded-t-lg bg-[#1b0f27] border-0 relative shadow-[#2d2d2c] shadow-sm">
        <CardContent className="p-0">
            <img src={feature.img} className="h-[250px] w-full rounded-t-lg" />
            <div className="px-4 py-2">
                <p className="text-md font-regular text-white font-bold">{feature.title}</p>
                <p className="text-sm font-text text-white">-{feature.description}</p>
            </div>
        </CardContent>
    </Card>
}

const subscriptions = [
    { id: 0, tier: "Core", price: 20, points: ['30 Pull Request Per Month', 'Unlimited Projects', 'Access to all models', 'Email Support'] },
    { id: 1, tier: "Scale", price: 50, points: ['80 Pull Request Per Month', 'Unlimited Projects', 'Access to all models', 'Email Support'] },
    { id: 2, tier: "Enterprise", price: 100, points: ['160 Pull Request Per Month', 'Unlimited Projects', 'Access to all models', 'Email Support'] }
]

function Subscriptions() {
    return <section>
        <div className="flex flex-col items-center space-y-8 px-4 ">
            <p className="text-3xl sm:text-4xl md::text-5xl xl:text-6xl text-white font-header">Subscriptions</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 w-[100%] mx-auto gap-4 justify-items-center">
                {subscriptions?.map(({ id, tier, points, price }, index) => {
                    const isThirdCard = index === 2;
                    return (
                        <div key={id} className={isThirdCard ? "lg:col-span-2 xl:col-span-1" : ""}>
                            <SubscriptionCard id={id} tier={tier} points={points} price={price} />
                        </div>
                    )
                })}
            </div>
        </div>
    </section>
}

function SubscriptionCard({ id, tier, points, price }: { id: number, tier: string, points: string[], price: number }) {
    const handleSubscriptionCheckout = async (tier: number) => {
        try {
            const response = await axios.post(`${API_URL}/payment/create-checkout-session`, {
                tier: tier,
                userID: id
            })

            window.location.href = response.data.url
        } catch (error) {
            console.error(error)
            throw error;
        }
    }

    return <Card className="w-[300px] md:w-[400px] h-[450px] mx-auto xl:mx-0 border-0 shadow-[#3c3b3a] card shadow-sm p-0 rounded-t-xl">
        <CardContent className='px-0'>
            <div className="flex flex-col items-center space-y-4 bg-[#1b0f27] rounded-t-xl pt-4 py-6">
                <p className="text-white font-header text-xl md:text-3xl">{tier}</p>
                <p className="text-white font-header text-3xl md:text-5xl">${price} USD</p>
            </div>

            <div className="flex flex-col items-center mt-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex flex-row items-center gap-2">
                        <GitPullRequest color='white' />
                        <p className="text-white text-lg md:text-xl font-text">{points[0]}</p>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                        <SquareChartGantt color='white' />
                        <p className="text-white text-lg md:text-xl font-text">{points[1]}</p>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                        <BotIcon color='white' />
                        <p className="text-white text-lg md:text-xl  font-text">{points[2]}</p>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                        <BadgeQuestionMark color='white' />
                        <p className="text-white text-lg md:text-xl  font-text">{points[3]}</p>
                    </div>
                </div>
                <Button onClick={() => handleSubscriptionCheckout(id)} className="hover:bg-[#1b0f27] cursor-pointer w-fit select-trigger mt-12 bg-[#1b0f27] text-white text-lg md:text-2xl font-header">
                    Choose {tier}
                </Button>
            </div>
        </CardContent>
    </Card>
}