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


export type Period = "daily" | "weekly" | "monthly";

interface DatePeriodRange {
    start_date: Date;
    end_date: Date;
}

export function getDatePeriodRange(period: Period): DatePeriodRange {
    const now = new Date();

    let start_date: Date;
    let end_date: Date;

    switch (period) {
        case "daily":
            start_date = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                0,
                0,
                0,
                0
            );

            end_date = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                23,
                59,
                59,
                999
            );
            break;

        case "weekly":
            const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...

            start_date = new Date(now);
            start_date.setDate(now.getDate() - day);
            start_date.setHours(0, 0, 0, 0);

            end_date = new Date(start_date);
            end_date.setDate(start_date.getDate() + 6);
            end_date.setHours(23, 59, 59, 999);
            break;

        case "monthly":
            start_date = new Date(
                now.getFullYear(),
                now.getMonth(),
                1,
                0,
                0,
                0,
                0
            );

            end_date = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
            );
            break;

        default:
            throw new Error("Invalid period");
    }

    return { start_date, end_date };
}



export function getLabels(period: Period): Record<number, string> {
    if (period === "monthly") {
        return {
            1: "Jan",
            2: "Feb",
            3: "Mar",
            4: "Apr",
            5: "May",
            6: "Jun",
            7: "Jul",
            8: "Aug",
            9: "Sep",
            10: "Oct",
            11: "Nov",
            12: "Dec",
        };
    }

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result: Record<number, string> = {};

    const today = new Date();
    const startOfWeek = new Date(today);

    // Monday as first day of week
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    startOfWeek.setDate(today.getDate() + diff);

    for (let i = 0; i < 7; i++) {
        const current = new Date(startOfWeek);
        current.setDate(startOfWeek.getDate() + i);

        result[current.getDate()] = days[current.getDay()];
    }

    return result;
}