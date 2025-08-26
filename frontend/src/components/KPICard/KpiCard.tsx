import React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../ui/card";

interface KpiCardProps {
    title: string;
    value: string | number;
    description: string;
    Icon: React.ReactNode;
    indicatorColor?: "red" | "green" | "neutral";
}

export const KpiCard: React.FC<KpiCardProps> = ({
    title,
    value,
    description,
    Icon,
    indicatorColor = "neutral",
}) => {
    let colorClass = "text-gray-500 dark:text-gray-400";
    if (indicatorColor === "red") colorClass = "text-red-500";
    if (indicatorColor === "green") colorClass = "text-green-500";

    return (
        <Card className="p-2 bg-card/80 border border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-3 pt-3">
                <div className="flex items-center gap-2">
                    {Icon}
                    <CardTitle className="text-sm font-medium">
                        {title}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">{value}</p>
                <CardDescription
                    className={`text-xs flex items-center gap-1 ${colorClass}`}
                >
                    {description}
                </CardDescription>
            </CardContent>
        </Card>
    );
};
