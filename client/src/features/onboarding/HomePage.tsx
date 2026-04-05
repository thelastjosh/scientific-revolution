import { useState } from "react";
import { useLocation } from "wouter";
import { Upload, FileText, Link as LinkIcon, Edit3, CheckCircle, ArrowRight, MessageSquare, Key, Send } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
    const [, setLocation] = useLocation();
    const [uploadOpen, setUploadOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [codeOpen, setCodeOpen] = useState(false);
    const [profileCreatedOpen, setProfileCreatedOpen] = useState(false);
    const [submissionType, setSubmissionType] = useState<string>("");

    const handleUploadComplete = (type: string) => {
        setSubmissionType(type);
        setUploadOpen(false);
        // Simulate upload processing time then show success dialog
        setTimeout(() => {
            setProfileCreatedOpen(true);
        }, 500);
    };

    const getWelcomeText = () => {
        switch(submissionType) {
            case 'file':
                return "Your credentials have been parsed. A preliminary profile has been constructed from your uploaded documents.";
            case 'link':
                return "We have successfully scraped your public profile. A network node has been initialized with your professional history.";
            case 'text':
                return "Your personal statement has been recorded. An identity vector has been generated based on your expertise.";
            default:
                return "Your profile has been initialized and is ready for network participation.";
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-foreground to-transparent opacity-20" />

            <div
                className="w-full max-w-2xl border border-border p-8 md:p-12 relative z-10 bg-background"
            >
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 uppercase">
                        How can you help?
                    </h1>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                            <DialogTrigger asChild>
                                <button className="group relative inline-flex items-center justify-center px-8 py-6 text-lg font-bold uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all w-full md:w-auto min-w-[200px]">
                                    <MessageSquare className="mr-3 w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                                    Chat
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl font-mono border-2 border-black dark:border-white p-0 gap-0 overflow-hidden h-[600px] flex flex-col">
                                <div className="p-4 border-b border-border bg-secondary/20 shrink-0">
                                    <DialogHeader>
                                        <DialogTitle className="uppercase tracking-widest text-lg flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" />
                                            Onboarding Agent
                                        </DialogTitle>
                                    </DialogHeader>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold">AI</span>
                                        </div>
                                        <div className="bg-secondary/50 p-4 rounded-r-lg rounded-bl-lg text-sm border border-border">
                                            Hello. To initialize your node on the network, I need to understand your capabilities. What is your primary area of expertise?
                                        </div>
                                    </div>
                                    <div className="flex gap-3 flex-row-reverse">
                                        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold">YOU</span>
                                        </div>
                                        <div className="bg-card p-4 rounded-l-lg rounded-br-lg text-sm border border-border">
                                            I'm a distributed systems engineer. I've worked heavily with Rust and consensus algorithms.
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold">AI</span>
                                        </div>
                                        <div className="bg-secondary/50 p-4 rounded-r-lg rounded-bl-lg text-sm border border-border space-y-2">
                                            <p>Understood. Logging: Rust, Distributed Systems, Consensus Algorithms.</p>
                                            <p>Are you currently affiliated with any recognized partner organizations or DAOs?</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 flex-row-reverse">
                                        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold">YOU</span>
                                        </div>
                                        <div className="bg-card p-4 rounded-l-lg rounded-br-lg text-sm border border-border">
                                            Yes, I'm a core contributor at Public AI.
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold">AI</span>
                                        </div>
                                        <div className="bg-secondary/50 p-4 rounded-r-lg rounded-bl-lg text-sm border border-border space-y-2">
                                            <p>Noted. Establishing relationship link to [[Public AI]].</p>
                                            <p>Your preliminary profile is ready. Would you like to finalize node initialization?</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-4 border-t border-border bg-card shrink-0">
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Type your response..." 
                                            className="w-full pl-4 pr-12 py-3 border border-border bg-transparent text-sm focus:outline-none focus:border-foreground transition-colors"
                                        />
                                        <button 
                                            onClick={() => handleUploadComplete('chat')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-secondary transition-colors"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                            <DialogTrigger asChild>
                                <button className="group relative inline-flex items-center justify-center px-8 py-6 text-lg font-bold uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all w-full md:w-auto min-w-[200px]">
                                    <Upload className="mr-3 w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                                    Upload
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl font-mono border-2 border-black dark:border-white p-0 gap-0 overflow-hidden">
                            <div className="p-6 border-b border-border bg-secondary/20">
                                <DialogHeader>
                                    <DialogTitle className="uppercase tracking-widest text-xl flex items-center gap-2">
                                        Submit Capabilities
                                    </DialogTitle>
                                    <DialogDescription>
                                        Provide context on how you can
                                        contribute to the network.
                                    </DialogDescription>
                                </DialogHeader>
                            </div>

                            <Tabs defaultValue="file" className="w-full">
                                <div className="border-b border-border bg-muted/30 px-6 pt-2">
                                    <TabsList className="bg-transparent p-0 gap-6">
                                        <TabsTrigger
                                            value="file"
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 uppercase text-xs font-bold tracking-widest text-muted-foreground data-[state=active]:text-foreground"
                                        >
                                            File Upload
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="link"
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 uppercase text-xs font-bold tracking-widest text-muted-foreground data-[state=active]:text-foreground"
                                        >
                                            Link Profile
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="text"
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 uppercase text-xs font-bold tracking-widest text-muted-foreground data-[state=active]:text-foreground"
                                        >
                                            Manual Entry
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                            <div className="p-6 bg-background">
                                <TabsContent value="file" className="mt-0">
                                    <div 
                                        className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:bg-secondary/20 hover:border-foreground/50 transition-all cursor-pointer group"
                                        onClick={() => handleUploadComplete('file')}
                                    >
                                        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <FileText className="w-8 h-8 text-muted-foreground group-hover:text-foreground" />
                                        </div>
                                        <h3 className="text-sm font-bold uppercase mb-1">Drag & Drop Files Here</h3>
                                        <p className="text-xs text-muted-foreground mb-4">Support for PDF, MD, TXT (Max 10MB)</p>
                                        <span className="inline-block px-4 py-1.5 border border-border text-[10px] font-bold uppercase tracking-wider group-hover:bg-foreground group-hover:text-background transition-colors">
                                            Browse Files
                                        </span>
                                    </div>
                                </TabsContent>

                                <TabsContent value="link" className="mt-0 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold tracking-widest">Profile URL</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input 
                                                    type="url" 
                                                    placeholder="https://linkedin.com/in/..." 
                                                    className="w-full pl-9 pr-3 py-2 border border-border bg-transparent text-sm focus:outline-none focus:border-foreground transition-colors"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleUploadComplete('link')}
                                                className="px-4 py-2 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:opacity-90"
                                            >
                                                Link
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            We will parse your public profile to generate a contributor node.
                                        </p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="text" className="mt-0 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold tracking-widest">Self Description</label>
                                        <div className="relative">
                                            <Edit3 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <textarea 
                                                placeholder="I am an expert in distributed systems and have worked on..." 
                                                className="w-full pl-9 pr-3 py-2 border border-border bg-transparent text-sm focus:outline-none focus:border-foreground transition-colors min-h-[150px] resize-none"
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={() => handleUploadComplete('text')}
                                                className="px-6 py-2 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:opacity-90"
                                            >
                                                Submit
                                            </button>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                            </Tabs>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
                        <DialogTrigger asChild>
                            <button className="group relative inline-flex items-center justify-center px-8 py-6 text-lg font-bold uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all w-full md:w-auto min-w-[200px]">
                                <Key className="mr-3 w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                                Use Code
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md font-mono border-2 border-black dark:border-white p-8">
                            <DialogHeader>
                                <DialogTitle className="uppercase tracking-widest text-xl mb-2 flex items-center gap-2">
                                    <Key className="w-5 h-5" />
                                    Partner Node Code
                                </DialogTitle>
                                <DialogDescription>
                                    Enter the authorization code provided by your employer or partner organization.
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-6 mt-4">
                                <input 
                                    type="text" 
                                    placeholder="SR-XXXX-YYYY" 
                                    className="w-full px-4 py-3 border border-border bg-transparent text-lg font-bold text-center focus:outline-none focus:border-foreground transition-colors tracking-[0.2em] uppercase"
                                />
                                
                                <button 
                                    onClick={() => handleUploadComplete('code')}
                                    className="w-full bg-foreground text-background py-3 text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                                >
                                    Verify Code
                                </button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Dialog open={profileCreatedOpen} onOpenChange={setProfileCreatedOpen}>
                    <DialogContent className="sm:max-w-md font-mono border-2 border-black dark:border-white p-8 text-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            
                            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter mb-4">
                                Profile Created
                            </DialogTitle>
                            
                            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                                {getWelcomeText()}
                            </p>
                            
                            <div className="space-y-4">
                                <button 
                                    onClick={() => setLocation('/dashboard')}
                                    className="w-full bg-black text-white dark:bg-white dark:text-black py-4 text-sm font-bold uppercase tracking-widest hover:opacity-90 flex items-center justify-center gap-2 group"
                                >
                                    Continue to Dashboard
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                                
                                <button
                                    onClick={() => setLocation('/profile')}
                                    className="text-xs text-muted-foreground uppercase tracking-widest hover:text-foreground hover:underline underline-offset-4"
                                >
                                    View Profile
                                </button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <div className="mt-8">
                        <button
                            onClick={() => setLocation("/dashboard")}
                            className="text-[10px] text-muted-foreground uppercase tracking-widest hover:text-foreground hover:underline underline-offset-4"
                        >
                            Skip to Dashboard
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-20 pt-10 border-t border-border">
                <div className="max-w-4xl mx-auto px-4">
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest text-center mb-6">Used By</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
                        <div className="font-bold text-sm tracking-tighter uppercase">UNICEF</div>
                        <div className="font-bold text-sm tracking-tighter uppercase">Berkman Klein Center</div>
                        <div className="font-bold text-sm tracking-tighter uppercase">Stanford AO</div>
                        <div className="font-bold text-sm tracking-tighter uppercase">Public AI</div>
                    </div>
                </div>
            </div>

            <div className="mt-12 pt-6 pb-12 text-[10px] text-muted-foreground font-mono text-center uppercase tracking-wider opacity-60">
                <p>Scientific Revolution (C) 2026 Sail v0</p>
            </div>
        </div>
    );
}
