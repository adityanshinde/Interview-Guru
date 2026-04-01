import { PlanTier } from '../../shared/constants/planLimits';

interface PlanBannerProps {
	plan: PlanTier;
	trialDaysRemaining: number;
	onUpgrade: () => void;
}

export function PlanBanner({ plan, trialDaysRemaining, onUpgrade }: PlanBannerProps) {
	if (plan === 'free' && trialDaysRemaining > 0) {
		return (
			<div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/50 rounded-lg p-4 mb-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-semibold text-orange-200">Free Trial Active</h3>
						<p className="text-sm text-orange-100">
							{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
						</p>
					</div>
					<button
						onClick={onUpgrade}
						className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-semibold transition text-sm"
					>
						Upgrade Now
					</button>
				</div>
			</div>
		);
	}

	if (plan === 'free') {
		return (
			<div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/50 rounded-lg p-4 mb-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-semibold text-red-200">Free Trial Expired</h3>
						<p className="text-sm text-red-100">Upgrade to continue using InterviewGuru</p>
					</div>
					<button
						onClick={onUpgrade}
						className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition text-sm"
					>
						Upgrade
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/50 rounded-lg p-4 mb-4">
			<div className="text-sm text-cyan-100">
				You're on the <span className="font-semibold capitalize">{plan}</span> plan
			</div>
		</div>
	);
}