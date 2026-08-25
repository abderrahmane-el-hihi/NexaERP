import "@/app/globals.css";

export const metadata = {
  title: "Print Document",
  description: "NexaERP Print Layout",
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased print:bg-white print:text-black">
        {children}
      </body>
    </html>
  );
}
