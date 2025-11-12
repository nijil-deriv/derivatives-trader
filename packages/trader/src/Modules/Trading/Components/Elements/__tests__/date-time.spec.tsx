import { render, screen, waitFor } from '@testing-library/react';

import DateTime from '../date-time';

describe('DateTime', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('should render date and time in GMT format', () => {
        const mockDate = new Date('2024-01-15T14:30:45Z');
        jest.setSystemTime(mockDate);

        render(<DateTime />);

        expect(screen.getByText('15 Jan 2024')).toBeInTheDocument();
        expect(screen.getByText('14:30:45 GMT')).toBeInTheDocument();
    });

    it('should update time every second', async () => {
        const initialDate = new Date('2024-01-15T14:30:45Z');
        jest.setSystemTime(initialDate);

        render(<DateTime />);

        expect(screen.getByText('14:30:45 GMT')).toBeInTheDocument();

        // Advance time by 1 second
        jest.setSystemTime(new Date('2024-01-15T14:30:46Z'));
        jest.advanceTimersByTime(1000);

        await waitFor(() => {
            expect(screen.getByText('14:30:46 GMT')).toBeInTheDocument();
        });
    });

    it('should format single-digit days with leading zero', () => {
        const mockDate = new Date('2024-01-05T10:00:00Z');
        jest.setSystemTime(mockDate);

        render(<DateTime />);

        expect(screen.getByText('05 Jan 2024')).toBeInTheDocument();
    });

    it('should format single-digit hours with leading zero', () => {
        const mockDate = new Date('2024-01-15T09:05:03Z');
        jest.setSystemTime(mockDate);

        render(<DateTime />);

        expect(screen.getByText('09:05:03 GMT')).toBeInTheDocument();
    });

    it('should display correct month abbreviations', () => {
        const months = [
            { date: '2024-01-01', expected: 'Jan' },
            { date: '2024-02-01', expected: 'Feb' },
            { date: '2024-03-01', expected: 'Mar' },
            { date: '2024-04-01', expected: 'Apr' },
            { date: '2024-05-01', expected: 'May' },
            { date: '2024-06-01', expected: 'Jun' },
            { date: '2024-07-01', expected: 'Jul' },
            { date: '2024-08-01', expected: 'Aug' },
            { date: '2024-09-01', expected: 'Sep' },
            { date: '2024-10-01', expected: 'Oct' },
            { date: '2024-11-01', expected: 'Nov' },
            { date: '2024-12-01', expected: 'Dec' },
        ];

        months.forEach(({ date, expected }) => {
            jest.setSystemTime(new Date(date));
            const { unmount } = render(<DateTime />);
            expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
            unmount();
        });
    });

    it('should use UTC time regardless of local timezone', () => {
        // Set a specific UTC time
        const mockDate = new Date('2024-06-15T23:45:30Z');
        jest.setSystemTime(mockDate);

        render(<DateTime />);

        // Should display UTC time, not local time
        expect(screen.getByText('15 Jun 2024')).toBeInTheDocument();
        expect(screen.getByText('23:45:30 GMT')).toBeInTheDocument();
    });

    it('should cleanup interval on unmount', () => {
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        const { unmount } = render(<DateTime />);

        unmount();

        expect(clearIntervalSpy).toHaveBeenCalled();

        clearIntervalSpy.mockRestore();
    });

    it('should have correct CSS classes', () => {
        render(<DateTime />);

        const dateElement = screen.getByText(/\d{2} \w{3} \d{4}/);
        const timeElement = screen.getByText(/\d{2}:\d{2}:\d{2} GMT/);

        expect(dateElement).toHaveClass('trade-params-footer__date');
        expect(timeElement).toHaveClass('trade-params-footer__time');
    });

    it('should handle year transitions correctly', async () => {
        const mockDate = new Date('2023-12-31T23:59:59Z');
        jest.setSystemTime(mockDate);

        render(<DateTime />);

        expect(screen.getByText('31 Dec 2023')).toBeInTheDocument();

        // Advance to new year
        jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
        jest.advanceTimersByTime(1000);

        await waitFor(() => {
            expect(screen.getByText('01 Jan 2024')).toBeInTheDocument();
        });
    });
});
