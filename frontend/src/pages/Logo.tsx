import {Train} from 'lucide-react';

const Logo = () => {
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
                </div>
            </div>
        </div>
    );
}

export default Logo;
