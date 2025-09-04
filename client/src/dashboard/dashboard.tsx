import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { useEffect, useState } from "react"
import { BotIcon, Check, ExternalLink, GitPullRequest, Loader2, Plus, Send, SquareChartGantt, SquarePen, X } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select"
import { Input } from "../components/ui/input"
import githubIcon from '../assets/github.png';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { Label } from "../components/ui/label"
import type { Repo } from "../Interfaces/repos"
import { useAuth } from "../Contexts/authContext"
import { models } from "../lib/models"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios, { AxiosError } from "axios"
import type { Chat, Project } from "../Interfaces/project"
import { ScrollArea } from "../components/ui/scroll-area"
import { clientSocket, registerWithAgent } from "../socket-client"
import Navbar from "../Navbar/navbar"
const API_URL = import.meta.env.VITE_API_URL


export function DashboardPage() {
    return <div className="min-h-screen main-background flex flex-col space-y-8">
        <Navbar />
        <Dashboard />
    </div>
}

const choices: [React.ReactElement, string][] = [[<BotIcon />, 'Agent'], [<SquareChartGantt />, 'Projects'], [<GitPullRequest />, 'Chats']]

function Dashboard() {
    const { email, accessToken } = useAuth()
    const { data: projects } = useQuery<Project[]>({
        queryKey: ['projects', email],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/project`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            return res.data['projects']
        },
        staleTime: 1000 * 60 * 10,
        enabled: !!accessToken,
    })

    const [option, setOption] = useState('Agent')
    const [selectedProject, setSelectedProject] = useState<Project | null>((projects && projects?.length > 0) ? projects[0] : null)
    const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024)
    const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth >= 500)
    const [smallView, setSmallView] = useState<boolean>(window.innerWidth >= 390)

    const changeWidth = () => {
        setIsDesktop(window.innerWidth >= 1024)
        setIsMobile(window.innerWidth >= 500)
        setSmallView(window.innerWidth >= 390)
    }

    useEffect(() => {
        window.addEventListener('resize', changeWidth)

        return () => {
            window.removeEventListener('resize', changeWidth)
        }
    }, [])

    const renderOption = (option: string) => {
        if (option === 'Agent') {
            return <Agent selectedProject={selectedProject} setSelectedProject={setSelectedProject} projects={projects || null} />
        } else if (option === 'Projects') {
            return <Projects selectedProject={selectedProject} setSelectedProject={setSelectedProject} projects={projects || null} />
        } else if (option === "Chats") {
            return <RecentIssuesAndPRs />
        }
    }

    return <div className="mx-auto w-[95%]">
        <Card className={isDesktop ? 'py-0 gap-0 flex flex-row h-[800px] card border-transparent' : 'py-0 gap-0 flex flex-col h-fit overflow-hidden card border-transparent'}>
            <div className={isDesktop ? "flex flex-col h-full items-start py-8 px-2" : "flex flex-row flex-wrap items-start pt-2 sm:py-4 sm:px-2"}>
                {choices?.map((choice, i) => <Button key={i} onClick={() => setOption(choice[1])} variant='ghost' className={isMobile ? "text-white font-header text-xl" : (smallView ? 'text-white font-header text-[14px]' : "text-white font-header text-[11px]")}>
                    {choice}
                </Button>)}
            </div>

            <div className="flex w-full flex-col h-full">
                {renderOption(option)}
            </div>
        </Card >
    </div >
}

function Agent({ selectedProject, setSelectedProject, projects }: { selectedProject: Project | null, setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>, projects: Project[] | null }) {
    const queryClient = useQueryClient()
    const { email, accessToken, count, role } = useAuth()

    const CURRENT_USER_ROLE = role === 'developer' ? 'dev' : 'user'
    const [modelSelected, setModelSelected] = useState<string>(models[0].name)
    const [chatInput, setChatInput] = useState("")
    const [latestChat, setLatestChat] = useState<Chat | null>(null)
    const [isProcessingMessage, setIsProcessingMessage] = useState(false)
    const [currentStep, setCurrentStep] = useState<string>("")
    const [agentError, setAgentError] = useState<string | null>(null)
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
    const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null)
    const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024)

    const userCount = selectedProject?.requests_available || count

    const changeWidth = () => {
        setIsDesktop(window.innerWidth >= 1024)
    }

    useEffect(() => {
        window.addEventListener('resize', changeWidth)

        return () => {
            window.removeEventListener('resize', changeWidth)
        }
    }, [])

    useEffect(() => {
        if (email) {
            registerWithAgent(email)
        }

        clientSocket.on('agent_response', (data) => {
            const { message } = data
            setCurrentStep(message)
        })

        clientSocket.on('agent_error', (data) => {
            if (!isProcessingMessage) return;
            const { pr_url } = data
            setAgentError(pr_url)
            setIsProcessingMessage(false)
            setTimeoutMessage(null)
            if (timeoutId) {
                clearTimeout(timeoutId)
                setTimeoutId(null)
            }
        })

        clientSocket.on('pr_submitted', ({ chat }) => {
            if (!isProcessingMessage) return;
            setIsProcessingMessage(false)
            setTimeoutMessage(null)
            if (timeoutId) {
                clearTimeout(timeoutId)
                setTimeoutId(null)
            }
            queryClient.invalidateQueries({ queryKey: ['projects', email], refetchType: 'all' })
            setChatInput("")
            setLatestChat(chat)
        })

        return () => {
            clientSocket.off('agent_response')
            clientSocket.off('agent_error')
            clientSocket.off('pr_submitted')
        }
    }, [clientSocket, email, isProcessingMessage, timeoutId])

    const updateProjectChatMutation = useMutation({
        mutationKey: ['projects', email],
        mutationFn: async (socketId: string) => {
            await axios.put(`${API_URL}/project/${selectedProject?.id}/chat`, {
                userPrompt: chatInput,
                userEmail: email,
                socketId: socketId,
                llm_model_type: selectedProject?.selected_model?.type || models.find(model => model.name === modelSelected)?.type || models[0].type,
                llm_model_name: selectedProject?.selected_model?.name || modelSelected
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', email] })
        },
        onError: (error) => {
            setIsProcessingMessage(false)
            if (error instanceof AxiosError) {
                setAgentError(error.response?.data.message)
            }
            console.error("Failed to update project chat", error)
        }
    })

    useEffect(() => {
        if (!projects) return

        if (!selectedProject) {
            setSelectedProject(projects[0])
            return
        }

        setSelectedProject(projects?.find(p => p.id === selectedProject.id) || null)
    }, [projects])

    const handleSendMessage = async () => {
        if (chatInput.trim() && selectedProject && userCount && userCount > 0) {
            setIsProcessingMessage(true)
            setLatestChat(null)
            setAgentError(null)
            setCurrentStep("")
            setTimeoutMessage(null)
            if (timeoutId) {
                clearTimeout(timeoutId)
                setTimeoutId(null)
            }
            if (!clientSocket.id) {
                setAgentError("Failed to connect to the agent")
                return
            }

            const id = setTimeout(() => {
                setTimeoutMessage("Please check back in a minute or retry again.")
                setIsProcessingMessage(false)
            }, 8 * 60 * 1000)
            setTimeoutId(id)
            updateProjectChatMutation.mutate(clientSocket.id)
        }
    }
    return <div className="flex flex-col w-full h-full px-2 md:px-6">
        <div className="text-white flex flex-row  py-4">
            <div className="flex flex-row flex-wrap items-center gap-4">
                <ProjectSelector selectedProject={selectedProject} setSelectedProject={setSelectedProject} projects={projects || []} />
                <ModelSelector modelSelected={modelSelected} setModelSelected={setModelSelected} agent={true} />
            </div>
            {isDesktop && <p className="text-white sm:text-2xl md:text-4xl xl:text-5xl font-header ml-auto pr-4">Agent</p>}
        </div>

        <div className="flex flex-row my-4 lg:my-8 gap-6">
            <div className="w-[100%] lg:w-[60%] xl:w-[70%] flex flex-col text-white">
                <div className="h-10 md:h-12 flex items-center flex-row space-x-1">
                    <Input
                        className="h-full border-0 shadow-sm shadow-black/50 bg-[#1b0f27] text-white focus-visible:ring-0 focus-visible:border-none"
                        placeholder="Tell the agent your issue or request a feature"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSendMessage()
                            }
                        }}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={!email || !projects || projects.length === 0 || !selectedProject}
                    />
                    <Button className="w-8 h-full bg-[#1d102a] cursor-pointer shadow-sm shadow-black/50 hover:bg-[#1d102a]"
                        onClick={() => { handleSendMessage() }}
                        disabled={!chatInput.trim() || !selectedProject || isProcessingMessage || userCount === 0}>
                        <Send />
                    </Button>
                </div>
                {email && selectedProject && (
                    <RequestsLeft
                        email={email}
                        projectId={selectedProject.id}
                        accessToken={accessToken}
                    />
                )}

                {isProcessingMessage && (
                    <Card className="bg-[#1b0f27] border-0 select-content my-12">
                        {timeoutMessage ? <CardContent className="flex flex-col items-center justify-center py-8">
                            <span className="text-sm text-white">Please check back in a minute or try again</span>
                            <span className="text-sm text-white">(We do not charge for calls that fail, this may change in the future.)</span>
                        </CardContent>
                            :
                            <CardContent className="flex flex-col items-center justify-center py-8">
                                <div className="flex items-center gap-2">
                                    <Loader2 color='white' className="h-4 w-4 animate-spin" />
                                    <span className="text-sm font-medium text-white">Agent Fulfilling Request</span>
                                </div>
                                <span className="text-sm font-medium text-white">{currentStep}</span>
                            </CardContent>}
                    </Card>
                )}

                {agentError && (
                    <Card className="bg-[#1b0f27] border-0 select-content my-12">
                        <CardContent>
                            <p className="text-sm font-medium text-white">{agentError}</p>
                        </CardContent>
                    </Card>
                )}

                {latestChat && !isProcessingMessage && (
                    <Card className="bg-[#1b0f27] border-0 select-content my-12">
                        <CardHeader>
                            <CardTitle className="text-white">Agent Response</CardTitle>
                            <CardDescription className="text-[rgb(224,224,224)]">The agent has fulfilled your request and the owner of the project has been notified</CardDescription>
                        </CardHeader>
                        {CURRENT_USER_ROLE === "dev" && <CardContent>
                            <p className="text-white">{latestChat.message}</p>
                            <a href={latestChat.pullRequestUrl} target="_blank" rel="noopener noreferrer">
                                <Button className="cursor-pointer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View PR
                                </Button>
                            </a>
                        </CardContent>}
                    </Card>
                )}

                {(selectedProject && !isDesktop) && <div className="mt-6 flex flex-col">
                    <AgentChats project={selectedProject} isDesktop={false} />
                </div>}
            </div>

            {(selectedProject && isDesktop) && <div className="w-[40%] xl:w-[30%] ml-auto flex flex-col space-y-4">
                <AgentChats project={selectedProject} isDesktop={true} />
            </div>}
        </div>
    </div >
}

function RequestsLeft({
    email,
    projectId,
    accessToken,
}: {
    email: string | null | undefined
    projectId: string | undefined
    accessToken: string | null | undefined
}) {
    const { data: requestsLeft } = useQuery<
        Project[],              // TData (what queryFn returns)
        unknown,                // TError
        number | undefined,     // TSelected (what `select` returns)
        [string, string | null | undefined] // TQueryKey
    >({
        queryKey: ['projects', email],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/project`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            return res.data.projects as Project[]
        },
        enabled: !!email && !!accessToken && !!projectId,
        staleTime: 1000 * 60 * 10,
        select: (projects) =>
            projects.find((p) => p.id === projectId)?.requests_available,
    })

    if (!projectId) return null

    return (
        <p className="text-md font-regular self-end mr-1 mt-2">
            {requestsLeft !== undefined && requestsLeft > 0
                ? `This project has ${requestsLeft} requests left`
                : `This project has no requests`}
        </p>
    )
}

function DisplayChat({ chat }: { chat: Chat }) {

    const queryClient = useQueryClient()
    const { role, accessToken, email } = useAuth()
    const CURRENT_USER_ROLE = role === 'developer' ? 'dev' : 'user'

    const markAsSeenMutation = useMutation({
        mutationFn: async (chat: Chat) => {

            await axios.put(`${API_URL}/project/${chat?.projectId}/mark-as-seen`, {
                chatId: chat.id
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', email] })
        },
        onError: (error) => {
            console.error("Failed to mark as seen", error)
        }
    })

    const handleMarkAsSeen = (chat: Chat) => {
        markAsSeenMutation.mutate(chat)
    }

    return (chat.pullRequestUrl && chat.pullRequestUrl.length > 0) && <div className="relative flex flex-col space-y-1 px-4 py-2 h-fit w-full rounded-md bg-[#1d102a] border-0 select-trigger">
        {CURRENT_USER_ROLE === 'dev' && !chat.seen && (
            <div className="absolute -top-1 -right-1 z-10">
                <div onClick={() => handleMarkAsSeen(chat)} className="bg-[#1B1B1B] select-trigger hover:bg-[#1B1B1B] text-white rounded-full p-1 shadow-lg cursor-pointer transition-colors duration-200">
                    <Check className="w-4 h-4" />
                </div>
            </div>
        )}
        <p className="text-white line-clamp-2">{chat.message}</p>
        {CURRENT_USER_ROLE === 'dev' && <Button className="w-fit cursor-pointer" onClick={() => {
            window.open(chat.pullRequestUrl)
        }}>
            <GitPullRequest /> View PR
        </Button>}
    </div>
}

function ProjectSelector({ selectedProject, setSelectedProject, projects }: { selectedProject: Project | null, setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>, projects: Project[] }) {
    return <Select
        value={selectedProject?.id.toString()}
        onValueChange={(value) => setSelectedProject(projects?.find((p) => p.id.toString() === value) || null)}
        disabled={!projects || projects.length === 0}
    >
        <SelectTrigger className="w-48 !h-10 bg-[#1d102a] select-trigger cursor-pointer focus-visible:ring-0 text-white border-0 font-text mt-1" >
            <SelectValue
                className="text-white"
                placeholder={(!projects || projects.length === 0) ? "No projects available" : "Choose a project..."}
            />
        </SelectTrigger>

        <SelectContent className="bg-[#1b0f27] border-0 select-content">
            {projects && projects?.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()} className="bg-inherit cursor-pointer focus:bg-[#1b0f27] text-white focus:text-white font-text">
                    {project.repo.name}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
}

function ModelSelector({ modelSelected, setModelSelected, agent }: { modelSelected: string, setModelSelected: React.Dispatch<React.SetStateAction<string>>, agent: boolean }) {
    return <div className="self-end">
        {!agent && <label className="text-sm font-medium text-white mb-1">Select Model</label>}
        <Select value={modelSelected} onValueChange={(value) => setModelSelected(value)}>
            <SelectTrigger className="bg-[#1d102a] cursor-pointer text-white border-0 !h-10">
                <SelectValue placeholder="Choose a model..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1d102a] border-0">
                {models.map((model) => (
                    <SelectItem className="bg-inherit cursor-pointer focus:bg-[#1b0f27] text-white focus:text-white font-text" key={model.name} value={model.name}>
                        <img src={model.icon} alt={model.displayName} className="w-4 h-4 mr-2" />
                        {model.displayName}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
}



function Projects({ selectedProject, setSelectedProject, projects }: { selectedProject: Project | null, setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>, projects: Project[] | null }) {
    const { hasGithubToken, role, email } = useAuth()

    const CURRENT_USER_ROLE = role === 'developer' ? 'dev' : 'user'
    const [chatFilter, setChatFilter] = useState<string>('Latest')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1280)
    const [isLargeView, setIsLargeView] = useState<boolean>(window.innerWidth >= 1024)
    const [isMediumView, setIsMediumView] = useState<boolean>(window.innerWidth >= 768)

    const changeWidth = () => {
        setIsDesktop(window.innerWidth >= 1280)
        setIsLargeView(window.innerWidth >= 1024)
        setIsMediumView(window.innerWidth >= 768)
    }

    useEffect(() => {
        if (!projects) return

        if (!selectedProject) {
            setSelectedProject(projects[0])
            return
        }

        setSelectedProject(projects?.find(p => p.id === selectedProject.id) || null)
    }, [projects])

    useEffect(() => {
        window.addEventListener('resize', changeWidth)

        return () => {
            window.removeEventListener('resize', changeWidth)
        }
    }, [])

    return <div className="flex flex-col w-full h-full px-2 md:px-6 py-4 gap-2 sm:gap-4">
        <div className="flex flex-row items-end gap-4">
            <div className="flex flex-row flex-wrap items-center gap-2 md:gap-6">
                <ProjectSelector projects={projects || []} selectedProject={selectedProject} setSelectedProject={setSelectedProject} />
                <AddProject hasGithubToken={hasGithubToken} />
            </div>
            {(isDesktop && (CURRENT_USER_ROLE === 'dev' && selectedProject?.email === email)) && <div className="flex flex-row items-center gap-2">
                {selectedProject && <AddUser project={selectedProject} />}
                {selectedProject && <DeleteProject project={selectedProject} setProject={setSelectedProject} />}
            </div>}
            {isLargeView && <p className="text-white sm:text-2xl md:text-4xl xl:text-5xl font-header ml-auto pr-4">Projects</p>}
        </div>

        {(selectedProject?.chats && selectedProject?.chats.length > 0) && <div className="flex w-full flex-row items-center">
            {(!isDesktop && (CURRENT_USER_ROLE === 'dev' && selectedProject?.email === email)) && <div className="flex flex-row items-center gap-2">
                {selectedProject && <AddUser project={selectedProject} />}
                {selectedProject && <DeleteProject project={selectedProject} setProject={setSelectedProject} />}
            </div>}
            {(isMediumView && selectedProject && selectedProject?.chats?.length > 0) && <div className="flex flex-row ml-auto md:w-[40%] lg:w-[30%] gap-2 items-center">
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for chat" className="bg-[#1d102a] text-white border-0 focus-visible:ring-0 select-trigger" />
                <FilterChatSelector chatFilter={chatFilter} setChatFilter={setChatFilter} />
            </div>}
        </div>}

        {isMediumView ? <div className="flex flex-row w-full h-full">
            {selectedProject && <SelectedProject project={selectedProject} />}
            {selectedProject && <SelectedProjectChats isMediumView={isMediumView} project={selectedProject} chatFilter={chatFilter} searchQuery={searchQuery} />}
        </div> : <div className="flex flex-col w-full h-full space-y-4 ">
            {selectedProject && <SelectedProject project={selectedProject} />}
            {(selectedProject && selectedProject?.chats?.length > 0) && <div className="flex flex-col space-y-2 h-[250px]">
                <div className="flex flex-row w-full gap-2 items-center">
                    <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for chat" className="bg-[#1d102a] text-white border-0 focus-visible:ring-0 select-trigger" />
                    <FilterChatSelector chatFilter={chatFilter} setChatFilter={setChatFilter} />
                </div>
                {selectedProject && <SelectedProjectChats isMediumView={isMediumView} project={selectedProject} chatFilter={chatFilter} searchQuery={searchQuery} />}
            </div>}
        </div>
        }
    </div>
}

function FilterChatSelector({ chatFilter, setChatFilter }: { chatFilter: string, setChatFilter: React.Dispatch<React.SetStateAction<string>> }) {
    return <Select value={chatFilter} onValueChange={(v) => setChatFilter(v)}>
        <SelectTrigger className="w-48 bg-[#1d102a] select-trigger cursor-pointer focus-visible:ring-0 text-white border-0 font-text mt-1" >
            <SelectValue className="text-white" placeholder="Filter Chats" />
        </SelectTrigger>

        <SelectContent className="bg-[#1b0f27] border-0 select-content">
            <SelectItem className="bg-inherit cursor-pointer focus:bg-[#1b0f27] text-white focus:text-white font-text" value="Latest">Latest</SelectItem>
            <SelectItem className="bg-inherit cursor-pointer focus:bg-[#1b0f27] text-white focus:text-white font-text" value="Seen">Seen</SelectItem>
        </SelectContent>
    </Select>
}

function SelectedProject({ project }: { project: Project | null }) {
    const queryClient = useQueryClient()
    const { role, count, id, accessToken, setCount, email } = useAuth()
    const [updateRequestsOpen, setUpdateRequestsOpen] = useState<boolean>(false)
    const [newRequestCount, setNewRequestCount] = useState<string>('')

    const [newRequestsAvailable, setNewRequestsAvailable] = useState<number>(project?.requests_available || 0)
    const regex = /\d/;

    useEffect(() => {
        setNewRequestsAvailable(project?.requests_available || 0)
    }, [project])

    const handleCountUpdate = (newCount: string) => {
        const maxCount = (count || 0) + (project?.requests_available || 0)
        if (newCount.includes('-') || parseInt(newCount) < 0 || parseInt(newCount) > maxCount) return
        setNewRequestCount(newCount)
    }

    const handleUpdateUserCount = () => {
        if (!count || !project?.requests_available || (!parseInt(newRequestCount) && parseInt(newRequestCount) != 0)) {
            return
        }
    }

    const updateRequestsMutation = useMutation({
        mutationFn: async (requests: number) => {
            const res = await axios.post(`${API_URL}/project/${project?.id}/update-requests`, {
                requests: requests,
                id: id
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            return res.data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['projects', email] })
            const { userRequestsRemaining, newRequests } = data

            if (!data || (!userRequestsRemaining && userRequestsRemaining != 0) || !newRequests) {
                setNewRequestCount('')
                setUpdateRequestsOpen(false)
                return
            }
            setCount(userRequestsRemaining)
            setNewRequestsAvailable(newRequests)
            setNewRequestCount('')
            setUpdateRequestsOpen(false)
        },
    })

    const handleUpdateRequests = async () => {
        if (count === null || !project?.requests_available || (!parseInt(newRequestCount) && parseInt(newRequestCount) != 0)) {
            console.log('/')
            return
        }

        updateRequestsMutation.mutate(parseInt(newRequestCount))
    }

    return <div className="flex flex-col md:w-[60%] lg:w-[70%]">
        <div className="grid grid-cols-2 xl:grid-cols-3 space-y-4">
            <div className="flex flex-col text-white">
                <p className="font-text font-bold text-xs sm:text-sm lg:text-md">Project Name</p>
                <p className="font-regular break-words text-xs sm:text-sm lg:text-md">{project?.repo.name}</p>
            </div>
            <div className="flex flex-col text-white">
                <p className="font-text font-bold text-xs sm:text-sm lg:text-md">Project ID</p>
                <p className="font-regular break-words text-xs sm:text-sm lg:text-md">{project?.id}</p>
            </div>
            <div className="flex flex-col text-white">
                <p className="font-text font-bold text-xs sm:text-sm lg:text-md">Project Owner</p>
                <p className="font-regular break-words text-xs sm:text-sm lg:text-md">{project?.email}</p>
            </div>

            <div className="flex flex-col text-white">
                <p className="font-text font-bold text-xs sm:text-sm lg:text-md">Your role</p>
                <p className="font-regular text-xs sm:text-sm lg:text-md">{role}</p>
            </div>
            <div className="flex flex-col text-white">
                <p className="font-text font-bold text-xs sm:text-sm lg:text-md">Model</p>
                {project?.selected_model ? <p className="font-regular break-words text-xs sm:text-sm lg:text-md">{project?.selected_model?.name || ''}</p>
                    :
                    <p className="font-regular break-words text-xs sm:text-sm lg:text-md">This project can use any model</p>
                }
            </div>
            <div className="flex flex-row">
                <div className="flex flex-col text-white">
                    <p className="font-text font-bold text-xs sm:text-sm lg:text-md">Requests Available</p>
                    <p className="font-regular text-xs sm:text-sm lg:text-md">{newRequestsAvailable}</p>
                </div>
                <Dialog open={updateRequestsOpen} onOpenChange={(e) => setUpdateRequestsOpen(e)}>
                    <DialogTrigger asChild>
                        <SquarePen color='white' className="ml-2 w-4 h-4 sm:w-6 sm:h-6 cursor-pointer" />
                    </DialogTrigger>

                    <DialogContent className="max-w-md border-0 main-background">
                        <DialogHeader>
                            <DialogTitle className="text-white">Update Project Requests</DialogTitle>
                            <DialogDescription className="text-[rgb(224,224,224)]">
                                Increase or decrease the amount of requests for your project
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-2">
                            <p className="text-white font-text">You have {count || 0} requests</p>
                            <div className="flex flex-col">
                                <Label htmlFor="currentCount" className="text-white mb-1 font-regular font-semibold">Current Project Count</Label>
                                <Input id="currentCount" value={newRequestsAvailable}
                                    disabled={true}
                                    className="bg-[#1d102a] w-20 text-white border-0 focus-visible:ring-0 select-trigger"
                                    type="text"
                                />
                            </div>
                            <div className="flex flex-col">
                                <Label htmlFor="newRequestCount" className="text-white mb-1 font-regular font-semibold">New Project Count</Label>
                                <Input
                                    className="bg-[#1d102a] w-20 text-white border-0 focus-visible:ring-0 select-trigger"
                                    type="text"
                                    onBlur={handleUpdateUserCount}
                                    id="newRequestCount"
                                    value={newRequestCount}
                                    onChange={(e) => handleCountUpdate(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content">
                                Cancel
                            </Button>
                            <Button
                                className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content"
                                disabled={newRequestCount === '' || Number.isNaN(parseInt(newRequestCount)) || parseInt(newRequestCount) === 0 || (newRequestCount.length > 1 && !regex.test(newRequestCount[0]))}
                                onClick={handleUpdateRequests}
                            >
                                Update
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        <ProjectUsers project={project} />
    </div >
}

function AgentChats({ project, isDesktop }: { project: Project, isDesktop: boolean }) {
    const projectChats = project.chats?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return <ScrollArea className={isDesktop ? 'w-full max-h-[600px]' : 'w-full max-h-[300px]'}>
        <div className="flex flex-col space-y-4">
            {projectChats?.map((chat, i) => (
                <DisplayChat key={i} chat={chat} />
            ))}
        </div>
    </ScrollArea>
}

function SelectedProjectChats({ project, chatFilter, searchQuery, isMediumView }: { project: Project, chatFilter: string, searchQuery: string, isMediumView: boolean }) {
    const projectChats = project.chats?.filter((chat) => chatFilter === 'Seen' ? chat.seen : true)
        .filter(chat => {
            const lowerCaseQuery = searchQuery.toLowerCase();
            if (!searchQuery) return true; // If no search query, return all filtered chats

            const messageMatches = chat.message.toLowerCase().includes(lowerCaseQuery);
            const userEmailMatches = chat.userEmail.toLowerCase().includes(lowerCaseQuery);
            const dateMatches = chat.createdAt.split("T")[0].includes(lowerCaseQuery); // Simple date string match for YYYY-MM-DD

            return messageMatches || userEmailMatches || dateMatches;
        })
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return <ScrollArea className={isMediumView ? "md:w-[40%] lg:w-[30%] max-h-[600px]" : "md:w-[40%] lg:w-[30%] max-h-[200px]"}>
        <div className="flex flex-col space-y-4">
            {projectChats?.map((chat, i) => (
                <DisplayChat key={i} chat={chat} />
            ))}
        </div>
    </ScrollArea>
}

function AddProject({ hasGithubToken }: { hasGithubToken: boolean }) {
    const queryClient = useQueryClient()
    const { id, email, accessToken, count, setCount, role } = useAuth()

    const CURRENT_USER_ROLE = role === 'developer' ? 'dev' : 'user'
    const { data: repos } = useQuery<Repo[]>({
        queryKey: ['repos', id],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/repos/${id}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })

            return res.data['repos']
        },
        staleTime: 1000 * 60 * 10,
        enabled: !!accessToken && hasGithubToken
    })

    const [isProjectModelSelected, setIsProjectModelSelected] = useState(false)
    const [modelSelected, setModelSelected] = useState<string>(models[0].name)
    const [projectRequestCount, setProjectRequestCount] = useState<string>("")
    const [projectUserEmails, setProjectUserEmails] = useState<string[]>([])
    const [currentEmailInput, setCurrentEmailInput] = useState("")
    const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
    const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false)

    const handleAddEmailToProject = () => {
        if (currentEmailInput.trim() && !projectUserEmails.includes(currentEmailInput.trim())) {
            setProjectUserEmails([...projectUserEmails, currentEmailInput.trim()])
            setCurrentEmailInput("")
        }
    }

    const handleRemoveEmailFromProject = (email: string) => {
        setProjectUserEmails(projectUserEmails.filter(e => e !== email))
    }

    const addProjectMutation = useMutation({
        mutationFn: async () => {
            await axios.post(`${API_URL}/project/`, {
                user_id: id,
                email: email,
                llm_model_type: isProjectModelSelected ? models.find(model => model.name === modelSelected)?.type || models[0].type : null,
                llm_model_name: isProjectModelSelected ? modelSelected : null,
                repo: selectedRepo,
                users: projectUserEmails,
                requests: parseInt(projectRequestCount)
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', email] })
            setCount(count ? count - parseInt(projectRequestCount) : count)
            setSelectedRepo(null)
            setProjectUserEmails([])
            setCurrentEmailInput("")
            setIsAddProjectDialogOpen(false)
            setProjectRequestCount("")
        },
        onError: (error) => {
            console.error("Failed to add project", error)
        }
    })

    const handleAddProject = async () => {
        if (selectedRepo && parseInt(projectRequestCount) > 0 && (count !== null && parseInt(projectRequestCount) <= count)) {
            addProjectMutation.mutate()
        }
    }

    return <Dialog open={isAddProjectDialogOpen} onOpenChange={(b) => {
        setIsAddProjectDialogOpen(b)
    }}>
        <DialogTrigger asChild>
            <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] !h-10 self-end" disabled={CURRENT_USER_ROLE === 'user'}>
                <Plus className="h-4 w-4 mr-2" />
                Add Project
            </Button>
        </DialogTrigger>
        <DialogContent className="w-[95%] sm:max-w-sm md:max-w-md border-0 main-background">
            <DialogHeader>
                <DialogTitle className="text-white">Add New Project</DialogTitle>
                <DialogDescription className="text-[rgb(224,224,224)]">
                    Select a repository and add users to create a new project.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
                <div>
                    {hasGithubToken ? (
                        <div>
                            <Label htmlFor="repo-select" className="text-white mb-1 text-sm font-regular">Select Repository</Label>
                            <Select value={selectedRepo?.id.toString()} onValueChange={(value) => setSelectedRepo(repos?.find((r) => r.id.toString() === value) || null)}>
                                <SelectTrigger className="bg-[#1d102a] cursor-pointer select-trigger border-0 w-56 max-w-[80%] text-white">
                                    <SelectValue placeholder="Choose a repository..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1d102a] select-content border-0">
                                    {repos && repos?.map((repo) => (
                                        <SelectItem className="bg-transparent  focus:text-white focus:bg-transparent cursor-pointer text-white" key={repo.id} value={repo.id.toString()}>
                                            {repo.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div onClick={() => window.open(`https://github.com/login/oauth/authorize?client_id=Ov23liYl4wln6vn4lhhX&scope=repo&state=${accessToken}`)} className="cursor-pointer flex items-center justify-center p-4 border border-dashed border-muted-foreground/25 rounded-md bg-muted/50">
                            <div className="text-center">
                                <img src={githubIcon} className="w-8 h-8 mx-auto mb-2 opacity-50" alt="GitHub" />
                                <p className="text-sm text-muted-foreground">Link your repositories from GitHub</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Connect your GitHub account to select repositories</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-white">Choose a specific model for this project?</label>
                        <input className="self-start h-4 w-4" type="checkbox" checked={isProjectModelSelected} onChange={() => {
                            setIsProjectModelSelected(!isProjectModelSelected)
                        }} />
                    </div>

                </div>

                {isProjectModelSelected && <ModelSelector modelSelected={modelSelected} setModelSelected={setModelSelected} agent={false} />}

                <div>
                    <Label htmlFor="requests" className="text-sm font-medium text-white mb-1">Requests for Project</Label>
                    <Input
                        id="requests"
                        type="text"
                        className="bg-[#1d102a] text-white border-0 focus-visible:ring-0 select-trigger"
                        placeholder="e.g. 5"
                        value={projectRequestCount}
                        onChange={(e) => {
                            setProjectRequestCount(e.target.value)
                        }}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                        You currently have {count} requests.
                    </p>
                </div>

                <div>
                    <Label htmlFor="user-emails" className="text-sm font-medium text-white mb-1">Add Users</Label>
                    <div className="flex gap-2">
                        <Input
                            id="user-emails"
                            type="email"
                            className="bg-[#1d102a] text-white border-0 focus-visible:ring-0 select-trigger"
                            placeholder="user@example.com"
                            value={currentEmailInput}
                            onChange={(e) => setCurrentEmailInput(e.target.value)}
                        />
                        <Button
                            type="button"
                            className="bg-[#1d102a] select-trigger"
                            onClick={handleAddEmailToProject}
                            disabled={!currentEmailInput.trim()}
                        >
                            <Plus color='white' className="h-4 w-4" />
                        </Button>
                    </div>

                    {projectUserEmails.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {projectUserEmails.map((email) => (
                                <div key={email} className="bg-[#1d102a] select-content flex items-center justify-between p-2 rounded">
                                    <span className="text-sm text-white">{email}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="cursor-pointer hover:bg-black"
                                        onClick={() => handleRemoveEmailFromProject(email)}
                                    >
                                        <X className="h-3 w-3" color='white' />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content" onClick={() => setIsAddProjectDialogOpen(false)}>
                    Cancel
                </Button>
                <Button
                    onClick={handleAddProject}
                    className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content"
                    disabled={!selectedRepo || parseInt(projectRequestCount) <= 0 || (count != null && parseInt(projectRequestCount) > (count))}
                >
                    Add Project
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}

function AddUser({ project }: { project: Project }) {
    const queryClient = useQueryClient()
    const { email, accessToken } = useAuth()
    const [newUserEmail, setNewUserEmail] = useState("")
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)

    const addUserMutation = useMutation({
        mutationFn: async () => {
            await axios.post(`${API_URL}/project/${project?.id}/invite-user`, {
                userEmail: newUserEmail
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', email] })
            setNewUserEmail("")
            setIsAddUserDialogOpen(false)
        },
        onError: (error) => {
            console.error("Failed to add user", error)
        }
    })

    const handleAddUser = () => {
        if (newUserEmail.trim()) {
            addUserMutation.mutate()
        }
    }

    return <div>
        <div className="relative">
            <Dialog open={isAddUserDialogOpen} onOpenChange={(prev) => {
                setIsAddUserDialogOpen(prev)
            }}>
                <DialogTrigger asChild>
                    <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] !h-10">
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </DialogTrigger>
                <DialogContent className="w-[95%] sm:max-w-sm md:max-w-md border-0 main-background">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add User to Project</DialogTitle>
                        <DialogDescription className="text-[rgb(224,224,224)]">
                            Enter the email address of the user you want to add to this project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="email" className="text-sm font-medium text-white mb-1">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                className="bg-[#1d102a] text-white border-0 focus-visible:ring-0 select-trigger"
                                placeholder="user@example.com"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content border-0 text-white hover:text-white" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content border-0" onClick={handleAddUser} disabled={!newUserEmail.trim()}>
                            Add User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </div>
}

function DeleteProject({ project, setProject }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project | null>> }) {
    const queryClient = useQueryClient()
    const { count, setCount, accessToken, email } = useAuth()
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    const deleteProjectMutation = useMutation({
        mutationFn: async () => {
            await axios.delete(`${API_URL}/project/${project?.id}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', email] })
            setIsDeleteDialogOpen(false)
            setProject(null)
            setCount(count ? count + (project?.requests_available || 0) : project?.requests_available || 0)
        },
        onError: (error) => {
            console.error("Failed to delete project", error)
            setIsDeleteDialogOpen(false)
        }
    })

    const handleDeleteProject = () => {
        if (project) {
            deleteProjectMutation.mutate()
        }
    }

    return <div>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] !h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    Delete Project
                </Button>
            </DialogTrigger>

            <DialogContent className="w-[95%] sm:max-w-sm md:max-w-md border-0 main-background">
                <DialogHeader>
                    <DialogTitle className="text-white">Delete Project</DialogTitle>
                    <DialogDescription className="text-[rgb(224,224,224)]">
                        This will permanently delete the project and cannot be undone. Are you sure you want to continue?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex items-center justify-end gap-2">
                    <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content border-0 text-white hover:text-white" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                    <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content border-0 text-white hover:text-white" variant="outline" onClick={handleDeleteProject}>Yes, delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
}

function ProjectUsers({ project }: { project: Project | null }) {
    const [localUsers, setLocalUsers] = useState(project?.users || [])

    useEffect(() => {
        setLocalUsers(project?.users || [])
    }, [project?.users])

    const handleUserRemoved = (userEmail: string) => {
        setLocalUsers(prev => prev.filter(u => u !== userEmail))
    }

    return (
        <div className="flex flex-col max-w-sm lg:max-w-md">
            <Label htmlFor='project-users' className="font-text font-bold text-white text-md mb-1">
                Project Users ({localUsers.length})
            </Label>
            <ScrollArea className="max-h-[350px]">
                <div className="flex flex-col gap-2">
                    {localUsers.map((user) => (
                        <DisplayUser
                            key={user}
                            project={project!}
                            user={user}
                            onUserRemoved={handleUserRemoved}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

function DisplayUser({ project, user, onUserRemoved }: { project: Project, user: string, onUserRemoved: (email: string) => void }) {
    const queryClient = useQueryClient()
    const { accessToken, email } = useAuth()

    const [isRemoveUserDialogOpen, setIsRemoveUserDialogOpen] = useState(false)
    const [userToRemove, setUserToRemove] = useState<string | null>(null)

    const removeUserMutation = useMutation({
        mutationFn: async (email: string) => {
            await axios.post(`${API_URL}/project/${project?.id}/remove-user`, {
                userEmail: email
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
        },
        onSuccess: () => {
            onUserRemoved(userToRemove!)
            queryClient.invalidateQueries({ queryKey: ['projects', email], refetchType: 'all' })
            setIsRemoveUserDialogOpen(false)
            setUserToRemove(null)
        },
        onError: (error) => {
            console.error("Failed to remove user", error)
            setIsRemoveUserDialogOpen(false)
            setUserToRemove(null)
        }
    })

    const handleRemoveUser = (email: string) => {
        setUserToRemove(email)
        setIsRemoveUserDialogOpen(true)
    }

    const confirmRemoveUser = () => {
        if (userToRemove) {
            removeUserMutation.mutate(userToRemove)
        }
    }

    return <div className="flex flex-row items-center justify-between space-y-1 px-4 py-2 h-fit  rounded-md bg-[#1d102a] border-0 select-trigger">
        <p className="text-white line-clamp-1 font-regular">{user}</p>
        <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveUser(user)}
            className="text-white cursor-pointer hover:text-destructive"
        >
            <X className="h-4 w-4" />
        </Button>
        <Dialog open={isRemoveUserDialogOpen} onOpenChange={setIsRemoveUserDialogOpen}>
            <DialogContent className="w-[95%] sm:max-w-sm md:max-w-md border-0 main-background">
                <DialogHeader>
                    <DialogTitle className="text-white">Are you sure?</DialogTitle>
                    <DialogDescription className="text-[rgb(224,224,224)]">
                        This will permanently remove {userToRemove} from the project. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content border-0 text-white hover:text-white" variant="outline" onClick={() => { setIsRemoveUserDialogOpen(false); setUserToRemove(null); }}>
                        Cancel
                    </Button>
                    <Button className="cursor-pointer bg-[#1d102a] hover:bg-[#1d102a] select-content border-0 text-white hover:text-white" variant="destructive" onClick={confirmRemoveUser}>
                        Yes, remove
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
}

function RecentIssuesAndPRs() {
    const { accessToken, email } = useAuth()
    const { data: projects } = useQuery<Project[]>({
        queryKey: ['projects', email],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/project`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            return res.data['projects']
        },
        staleTime: 1000 * 60 * 10,
        enabled: !!accessToken,
    })
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [chatFilter, setChatFilter] = useState<string>('Latest')
    const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024)
    const chats = projects?.flatMap(project => project.chats ?? []) ?? [];

    const changeWidth = () => {
        setIsDesktop(window.innerWidth >= 1024)
    }

    useEffect(() => {
        window.addEventListener('resize', changeWidth)

        return () => {
            window.removeEventListener('resize', changeWidth)
        }
    }, [])

    return <div className="flex flex-col w-full h-full px-4 py-2">
        <div className="flex flex-row items-end gap-6">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for chat" className="bg-[#1d102a] text-white border-0 focus-visible:ring-0 select-trigger" />
            <FilterRecentChatSelector chatFilter={chatFilter} setChatFilter={setChatFilter} />
            {isDesktop && <p className="text-white text-5xl font-header ml-auto pr-4">Chats</p>}
        </div>

        <div className="flex flex-col w-full my-6 h-[400px] md:h-[600px]">
            <RecentChats chats={chats} chatFilter={chatFilter} searchQuery={searchQuery} />
        </div>
    </div>
}

function FilterRecentChatSelector({ chatFilter, setChatFilter }: { chatFilter: string, setChatFilter: React.Dispatch<React.SetStateAction<string>> }) {
    return <Select value={chatFilter} onValueChange={(v) => setChatFilter(v)}>
        <SelectTrigger className="w-48 bg-[#1d102a] select-trigger cursor-pointer focus-visible:ring-0 text-white border-0 font-text mt-1" >
            <SelectValue className="text-white" placeholder="Filter Chats" />
        </SelectTrigger>

        <SelectContent className="bg-[#1b0f27] border-0 select-content">
            <SelectItem className="bg-inherit cursor-pointer focus:bg-[#1b0f27] text-white focus:text-white font-text" value="Latest">Latest</SelectItem>
            <SelectItem className="bg-inherit cursor-pointer focus:bg-[#1b0f27] text-white focus:text-white font-text" value="Created">Created</SelectItem>
            <SelectItem className="bg-inherit cursor-pointer focus:bg-[#1b0f27] text-white focus:text-white font-text" value="Not Created">Not Created</SelectItem>
            <SelectItem className="bg-inherit cursor-pointer focus:bg-[#1b0f27] text-white focus:text-white font-text" value="Seen">Seen</SelectItem>
        </SelectContent>
    </Select>
}


function RecentChats({ chats, chatFilter, searchQuery }: { chats: Chat[], chatFilter: string, searchQuery: string }) {
    const { email } = useAuth()

    const filterChats = (): Chat[] => {
        const filter = chatFilter.toLowerCase().trim()
        let filteredChats: Chat[] = []
        if (filter === 'seen') {
            filteredChats = chats.filter((chat) => chat.seen === true)
        } else if (filter === 'created') {
            filteredChats = chats.filter((chat) => chat.userEmail === email)
        } else if (filter === 'not created') {
            filteredChats = chats.filter((chat) => chat.userEmail !== email)
        } else if (filter === 'latest') {
            filteredChats = chats
        }

        return filteredChats.filter(chat => {
            const lowerCaseQuery = searchQuery.toLowerCase();
            if (!searchQuery) return true; // If no search query, return all filtered chats

            const messageMatches = chat.message.toLowerCase().includes(lowerCaseQuery);
            const userEmailMatches = chat.userEmail.toLowerCase().includes(lowerCaseQuery);
            const dateMatches = chat.createdAt.split("T")[0].includes(lowerCaseQuery); // Simple date string match for YYYY-MM-DD

            return messageMatches || userEmailMatches || dateMatches;
        })
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    const projectChats = filterChats()

    return <ScrollArea className="w-full max-h-full">
        <div className="flex flex-col space-y-4">
            {projectChats?.map((chat, i) => (
                <DisplayChat key={i} chat={chat} />
            ))}
        </div>
    </ScrollArea>
}