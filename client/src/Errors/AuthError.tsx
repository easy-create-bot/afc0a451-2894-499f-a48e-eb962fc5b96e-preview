import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AuthError({ error, setAuthError }: { error: string, setAuthError: React.Dispatch<React.SetStateAction<string | null>> }) {
    return (
        <Dialog open={!!error} onOpenChange={() => setAuthError(null)}>
            <DialogContent className="p-0 overflow-hidden">
                <div className="flex items-start gap-3 p-6">
                    <div className="rounded-full bg-muted text-muted-foreground p-2">
                        <AlertCircle className="size-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-base sm:text-lg">Authentication issue</DialogTitle>
                            <DialogDescription className="mt-1">
                                {error}
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>
                <DialogFooter className="bg-muted/40 px-6 py-4">
                    <Button className="cursor-pointer" variant="outline" onClick={() => setAuthError(null)}>OK</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}