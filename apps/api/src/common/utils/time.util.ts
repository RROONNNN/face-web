export class TimeUtil {
    static timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);

        return hours * 60 + minutes;
    }
}