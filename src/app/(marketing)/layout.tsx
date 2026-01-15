export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Marketing specific header/footer could go here */}
            {children}
        </div>
    );
}
