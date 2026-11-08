const toPaise = (amount) => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > 1000000000) {
        throw new Error('Amount must be greater than zero and within the supported limit');
    }
    return Math.round((value + Number.EPSILON) * 100);
};

const allocateSplit = ({ amount, splitType, participants, members }) => {
    const totalPaise = toPaise(amount);
    if (!Array.isArray(participants) || participants.length === 0) {
        throw new Error('At least one participant is required');
    }

    const allowedMembers = new Set(members.map((email) => email.toLowerCase()));
    const normalized = participants.map((participant) => ({
        ...participant,
        email: String(participant.email || '').trim().toLowerCase(),
    }));
    const uniqueEmails = new Set(normalized.map(({ email }) => email));

    if (
        uniqueEmails.size !== normalized.length ||
        normalized.some(({ email }) => !allowedMembers.has(email))
    ) {
        throw new Error('Participants must be unique members of this group');
    }

    let shares;
    if (splitType === 'equal') {
        const sorted = [...normalized].sort((a, b) =>
            a.email.localeCompare(b.email)
        );
        const base = Math.floor(totalPaise / sorted.length);
        let remainder = totalPaise - base * sorted.length;
        shares = sorted.map(({ email }) => ({
            email,
            amount: (base + (remainder-- > 0 ? 1 : 0)) / 100,
        }));
    } else if (splitType === 'exact') {
        shares = normalized.map(({ email, amount: shareAmount }) => {
            const value = Number(shareAmount);
            if (
                !Number.isFinite(value) ||
                value < 0 ||
                value > 1000000000
            ) {
                throw new Error('Each custom split amount must be zero or more');
            }
            return {
                email,
                amount: Math.round((value + Number.EPSILON) * 100) / 100,
            };
        });
        const shareTotal = shares.reduce(
            (sum, share) => sum + Math.round(share.amount * 100),
            0
        );
        if (shareTotal !== totalPaise) {
            throw new Error('Custom split amounts must add up to the expense total');
        }
    } else if (splitType === 'shares') {
        const weights = normalized.map(({ email, shares: weight }) => ({
            email,
            weight: Number(weight),
        }));
        if (
            weights.some(
                ({ weight }) => !Number.isFinite(weight) || weight <= 0
            )
        ) {
            throw new Error('Each participant must have a positive share weight');
        }

        const weightTotal = weights.reduce(
            (sum, participant) => sum + participant.weight,
            0
        );
        const allocations = weights.map(({ email, weight }) => {
            const exactPaise = (totalPaise * weight) / weightTotal;
            return {
                email,
                paise: Math.floor(exactPaise),
                remainder: exactPaise - Math.floor(exactPaise),
            };
        });
        let remainingPaise =
            totalPaise -
            allocations.reduce((sum, allocation) => sum + allocation.paise, 0);
        allocations
            .slice()
            .sort(
                (a, b) =>
                    b.remainder - a.remainder || a.email.localeCompare(b.email)
            )
            .slice(0, remainingPaise)
            .forEach((allocation) => {
                allocation.paise += 1;
            });
        shares = allocations.map(({ email, paise }) => ({
            email,
            amount: paise / 100,
        }));
    } else {
        throw new Error('Split type must be equal, exact, or shares');
    }

    return shares;
};

module.exports = { allocateSplit, toPaise };
