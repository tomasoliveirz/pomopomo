import { IClock } from '../../core/application/ports/IClock';

export class SystemClock implements IClock {
    now(): Date {
        return new Date();
    }
}
