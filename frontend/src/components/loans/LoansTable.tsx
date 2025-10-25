import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LoanTableRow } from "@/lib/api";
import { format, parseISO } from "date-fns";
const LoansTable: React.FC<{
    LoansData: {
        tableData: LoanTableRow[] | undefined;
        tableLoading: boolean;
        tableError: Error | null;
    };
}> = ({ LoansData: { tableData, tableLoading, tableError } }) => {
    return (
        <div className="grid grid-cols-1  gap-8 mb-8">
            {/* Active Loans Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Loans</CardTitle>
                </CardHeader>
                <CardContent>
                    {tableLoading && (
                        <div className="text-sm text-muted-foreground">
                            Loading loans data...
                        </div>
                    )}
                    {tableError && (
                        <div className="text-sm text-red-500">
                            Failed to load loans data
                        </div>
                    )}
                    {tableData && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 px-4">Sr No.</th>
                                        <th className="py-2 px-4">Date</th>
                                        <th className="py-2 px-4">Borrower</th>
                                        <th className="py-2 px-4">Amount</th>
                                        <th className="py-2 px-4">Paid</th>{" "}
                                        <th className="py-2 px-4">Remaining</th>
                                        <th className="py-2 px-4">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.map((loan, i) => (
                                        <tr
                                            key={loan.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="py-2 px-4 whitespace-nowrap ">
                                                {i + 1}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {format(
                                                    parseISO(loan.loanDate),
                                                    "dd-MMM yyy"
                                                )}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {loan.borrowerName}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap font-bold">
                                                {loan.totalAmount.toLocaleString(
                                                    "hi-IN"
                                                )}{" "}
                                                ₹
                                            </td>

                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {loan.paidAmount.toLocaleString(
                                                    "hi-IN"
                                                ) ?? 0}{" "}
                                                ₹
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {loan.remainingAmount.toLocaleString(
                                                    "hi-IN"
                                                ) ?? 0}{" "}
                                                ₹
                                            </td>

                                            <td className="py-2 px-4 whitespace-nowrap align-top">
                                                {loan.notes ? (
                                                    loan.notes.split(";")
                                                        .length > 1 ? (
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {loan.notes
                                                                .split(";")
                                                                .map(
                                                                    (
                                                                        noteRaw,
                                                                        idx
                                                                    ) => {
                                                                        const [
                                                                            text,
                                                                            amount,
                                                                        ] =
                                                                            noteRaw
                                                                                .trim()
                                                                                .split(
                                                                                    "--"
                                                                                );
                                                                        return (
                                                                            <li
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className="text-sm text-gray-700"
                                                                            >
                                                                                <b>
                                                                                    {
                                                                                        amount
                                                                                    }{" "}
                                                                                    ₹
                                                                                </b>{" "}
                                                                                {
                                                                                    text
                                                                                }
                                                                            </li>
                                                                        );
                                                                    }
                                                                )}
                                                        </ul>
                                                    ) : (
                                                        <div>{loan.notes}</div>
                                                    )
                                                ) : (
                                                    <span className="text-gray-400">
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default LoansTable;
