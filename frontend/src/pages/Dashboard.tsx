import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {ArrowRight, Train, Upload} from 'lucide-react';
import {useProject} from '@/contexts/ProjectContext';
import {toast} from 'sonner';

const Dashboard = () => {
    const navigate = useNavigate();
    const {loadProject} = useProject();
    const [isLoading, setIsLoading] = useState(false);

    const handleNewProject = () => {
        navigate('/new-project');
    };

    const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            await loadProject(file);
            toast.success('Projet chargé avec succès');
            navigate('/attestations');
        } catch (error) {
            toast.error('Erreur lors du chargement du projet');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-4xl space-y-8">
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <Train className="w-12 h-12 text-primary"/>
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Easy EEA
                        </h1>
                    </div>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Facilitez vos déplacements avec la réduction EEA de la SNCF et du Ministère chargé des
                        Transports sur Easy EEA
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-12">
                    <Card className="p-8 hover:border-primary/50 transition-all duration-300 group">
                        <div className="space-y-6">
                            <div
                                className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Train className="w-8 h-8 text-primary"/>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-2xl font-semibold">Nouveau projet</h2>
                                <p className="text-muted-foreground">
                                    Créez un nouveau projet de déplacements et organisez vos trajets récurrents
                                </p>
                            </div>

                            <Button
                                onClick={handleNewProject}
                                className="w-full group/btn"
                                size="lg"
                            >
                                Commencer
                                <ArrowRight
                                    className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform"/>
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-8 hover:border-secondary/50 transition-all duration-300 group">
                        <div className="space-y-6">
                            <div
                                className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                                <Upload className="w-8 h-8 text-secondary"/>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-2xl font-semibold">Charger un projet</h2>
                                <p className="text-muted-foreground">
                                    Importez un projet existant depuis un fichier JSON sauvegardé
                                </p>
                            </div>

                            <label className="space-y-6" htmlFor="file-upload">
                                <input
                                    id="file-upload"
                                    type="file"
                                    accept=".json"
                                    onChange={handleLoadProject}
                                    className="hidden"
                                />

                                <Button
                                    variant="secondary"
                                    className="w-full group/btn space-y-3"
                                    size="lg"
                                    disabled={isLoading}
                                    asChild
                                >
                                  <span className="cursor-pointer">
                                    {isLoading ? 'Chargement...' : 'Charger'}
                                      <ArrowRight
                                          className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform"/>
                                  </span>
                                </Button>
                            </label>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
