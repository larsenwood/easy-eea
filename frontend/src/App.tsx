import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {ProjectProvider} from "./contexts/ProjectContext";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import SelectTrains from "./pages/SelectTrains";
import Attestations from "./pages/Attestations";
import NotFound from "./pages/NotFound";
import Logo from "./pages/Logo";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <BrowserRouter>
                <ProjectProvider>
                    <Toaster/>
                    <Sonner/>
                    <Routes>
                        <Route path="/" element={<Dashboard/>}/>
                        <Route path="/new-project" element={<NewProject/>}/>
                        <Route path="/select-trains" element={<SelectTrains/>}/>
                        <Route path="/attestations" element={<Attestations/>}/>
                        <Route path="/logo" element={<Logo/>}/>
                        <Route path="*" element={<NotFound/>}/>
                    </Routes>
                </ProjectProvider>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
