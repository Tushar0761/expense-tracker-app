import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-6xl font-bold mb-4 text-red-500">404</h1>
            <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
                Sorry, the page you are looking for does not exist.
            </p>
            <Link to="/">
                <Button>Go to Dashboard</Button>
            </Link>
        </div>
    );
}
