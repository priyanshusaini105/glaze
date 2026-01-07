'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function ToastDemo() {
    const { toast } = useToast();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="glass-card rounded-2xl p-8 space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Toast Notifications</h1>
                        <p className="text-gray-600">Test the redesigned toast component with modern styling</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Default Toast</h2>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    onClick={() => {
                                        toast({
                                            title: "Default notification",
                                            description: "This is a default toast message with standard styling.",
                                        });
                                    }}
                                >
                                    Show Default
                                </Button>
                                <Button
                                    onClick={() => {
                                        toast({
                                            title: "Information",
                                            description: "Your changes have been saved successfully.",
                                        });
                                    }}
                                >
                                    Show Info
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-emerald-900 mb-3">Success Toast</h2>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    onClick={() => {
                                        toast({
                                            variant: "success",
                                            title: "Success!",
                                            description: "Your action was completed successfully.",
                                        });
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Show Success
                                </Button>
                                <Button
                                    onClick={() => {
                                        toast({
                                            variant: "success",
                                            title: "Table created",
                                            description: "Your new table has been created and is ready to use.",
                                        });
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Table Created
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-red-900 mb-3">Error Toast</h2>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    onClick={() => {
                                        toast({
                                            variant: "destructive",
                                            title: "Error",
                                            description: "Something went wrong. Please try again.",
                                        });
                                    }}
                                    variant="destructive"
                                >
                                    Show Error
                                </Button>
                                <Button
                                    onClick={() => {
                                        toast({
                                            variant: "destructive",
                                            title: "Failed to save",
                                            description: "Unable to save your changes. Check your connection and try again.",
                                        });
                                    }}
                                    variant="destructive"
                                >
                                    Save Failed
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Long Content</h2>
                            <Button
                                onClick={() => {
                                    toast({
                                        title: "Long notification title that might wrap to multiple lines",
                                        description: "This is a longer description that demonstrates how the toast handles multiple lines of text and maintains good readability with proper spacing and typography.",
                                    });
                                }}
                            >
                                Show Long Toast
                            </Button>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Multiple Toasts</h2>
                            <Button
                                onClick={() => {
                                    toast({
                                        variant: "success",
                                        title: "First notification",
                                        description: "This is the first toast.",
                                    });
                                    setTimeout(() => {
                                        toast({
                                            title: "Second notification",
                                            description: "This is the second toast.",
                                        });
                                    }, 500);
                                    setTimeout(() => {
                                        toast({
                                            variant: "destructive",
                                            title: "Third notification",
                                            description: "This is the third toast.",
                                        });
                                    }, 1000);
                                }}
                            >
                                Show Multiple
                            </Button>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Design Features:</h3>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                            <li>Glass morphism effect with backdrop blur</li>
                            <li>Consistent with your cyan/blue color scheme</li>
                            <li>Modern rounded corners (rounded-xl)</li>
                            <li>Smooth animations and transitions</li>
                            <li>Better visual hierarchy and spacing</li>
                            <li>Improved close button with hover states</li>
                            <li>Success variant for positive feedback</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
