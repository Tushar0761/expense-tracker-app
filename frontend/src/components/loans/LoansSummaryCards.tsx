import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const LoansSummaryCards: React.FC<{
    loansInsight: {
        totalPrincipal: number;
        totalInterest: number;
        amountPaid: number;
        amountPending: number;
    };
}> = ({ loansInsight }) => {
    const loansInsightData = useMemo(() => {
        return [
            {
                heading: "Total Principal",
                value: loansInsight?.totalPrincipal ?? "-",
                icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
                color: "text-gray-800",
                subtitle: "All time",
            },
            {
                heading: "Total Interest",
                value: loansInsight?.totalInterest ?? "-",
                icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
                color: "text-gray-800",
                subtitle: "All time",
            },
            {
                heading: "Amount Paid",
                value: loansInsight?.amountPaid ?? "-",
                icon: <TrendingUp className="h-4 w-4 text-green-500" />,
                subtitle: "Paid back",
                color: "text-green-600",
            },
            {
                heading: "Amount Pending",
                value: loansInsight?.amountPending ?? "-",
                icon: <TrendingDown className="h-4 w-4 text-red-500" />,
                color: "text-red-600",
                subtitle: "Still pending",
            },
        ];
    }, [loansInsight]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {loansInsightData.map((d, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {d.heading}
                        </CardTitle>
                        {d.icon}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${d.color}`}>
                            ₹{d.value.toLocaleString()}
                        </div>
                        <p className={`text-xs ${d.color}`}>{d.subtitle}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default LoansSummaryCards;
