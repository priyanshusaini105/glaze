// Toast Usage Examples
// Import the useToast hook in your component
import { useToast } from '@/hooks/use-toast';

export function YourComponent() {
    const { toast } = useToast();

    // ✅ SUCCESS TOAST - Use for positive confirmations
    const showSuccess = () => {
        toast({
            variant: "success",
            title: "Success!",
            description: "Your changes have been saved successfully.",
        });
    };

    // ❌ ERROR TOAST - Use for errors and failures
    const showError = () => {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Something went wrong. Please try again.",
        });
    };

    // ℹ️ INFO/DEFAULT TOAST - Use for general information
    const showInfo = () => {
        toast({
            title: "Information",
            description: "Your table has been updated.",
        });
    };

    // 📋 COMMON USE CASES

    // Table created successfully
    toast({
        variant: "success",
        title: "Table created",
        description: "Your new table is ready to use.",
    });

    // Data enrichment completed
    toast({
        variant: "success",
        title: "Enrichment complete",
        description: "Successfully enriched 25 cells.",
    });

    // Failed to save
    toast({
        variant: "destructive",
        title: "Failed to save",
        description: "Unable to save your changes. Please try again.",
    });

    // Network error
    toast({
        variant: "destructive",
        title: "Connection error",
        description: "Check your internet connection and try again.",
    });

    // General notification
    toast({
        title: "Processing",
        description: "Your request is being processed.",
    });

    return (
        // Your component JSX
        <div>...</div>
    );
}
