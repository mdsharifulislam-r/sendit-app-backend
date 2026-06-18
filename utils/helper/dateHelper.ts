type RangeType = 7 | 30 | 90

interface DateRange {
    startDate: Date;
    endDate: Date;
}

export function getDateRange(days: RangeType): DateRange {
    const endDate = new Date(); // today / now

    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return {
        startDate,
        endDate,
    };
}