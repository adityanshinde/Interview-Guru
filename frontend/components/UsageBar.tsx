interface UsageBarProps {
	label: string;
	used: number;
	limit: number;
	unit?: string;
}

export function UsageBar({ label, used, limit, unit = '' }: UsageBarProps) {
	const percentUsed = limit === 0 ? 0 : (used / limit) * 100;
	const remaining = Math.max(0, limit - used);

	let barColor = 'bg-green-500';
	if (percentUsed >= 50) barColor = 'bg-yellow-500';
	if (percentUsed >= 80) barColor = 'bg-red-500';

	return (
		<div className="space-y-1 p-3 bg-slate-900 rounded-lg border border-slate-700">
			<div className="flex justify-between text-sm">
				<span className="text-slate-300">{label}</span>
				<span className="text-slate-400 text-xs">
					{Math.round(percentUsed)}% used ({used}/{limit}{unit})
				</span>
			</div>

			<div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
				<div
					className={`h-full transition-all duration-300 ${barColor}`}
					style={{ width: `${Math.min(100, percentUsed)}%` }}
				/>
			</div>

			<div className="text-xs text-slate-500">
				{remaining}{unit} remaining this month
			</div>
		</div>
	);
}