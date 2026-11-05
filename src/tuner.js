// ── тюнер лайвопс-события: формулы GDD §8.2 ──
window.CV = window.CV || {};
CV.Tuner = {
  defaults: { T: 10, B: 12000, g: 0.7, P: 1200, d: 4, k: 1.0 },
  ranges: { T: [3, 21], B: [4000, 40000], g: [0.4, 1.0], P: [400, 4000], d: [0, 8] },

  //earned_c(t) = P_c · Σ_{i=1..t} (1 − d/100)^(i−1)
  sumFactor(d, T) { const k = 1 - d / 100; let s = 0; for (let i = 0; i < T; i++) s += Math.pow(k, i); return s; },
  earned(P, d, t) { const k = 1 - d / 100; let s = 0; for (let i = 0; i < t; i++) s += Math.pow(k, i); return P * s; },
  plan(B, g, T, k, t) { return B * g * Math.pow(t / T, k); },

  compute(p) {
    const { T, B, g, P, d, k } = p;
    const goal = B * g;
    const S = this.sumFactor(d, T);
    const cohorts = {
      avg: { P: P, total: P * S },
      newbie: { P: 0.55 * P, total: 0.55 * P * S },
      pro: { P: 1.6 * P, total: 1.6 * P * S },
    };
    // ряды по дням
    const series = { plan: [], avg: [], newbie: [], pro: [] };
    for (let t = 1; t <= T; t++) {
      series.plan.push(this.plan(B, g, T, k, t));
      series.avg.push(this.earned(P, d, t));
      series.newbie.push(this.earned(0.55 * P, d, t));
      series.pro.push(this.earned(1.6 * P, d, t));
    }
    // 5 проверок из GDD
    const mid = Math.floor(T / 2);
    const gapN = goal - cohorts.newbie.total;
    const checks = [
      { id: 'c1', ok: cohorts.avg.total >= goal, detail: [cohorts.avg.total, goal] },
      { id: 'c2', ok: gapN > 0 && gapN <= 0.35 * goal, detail: [gapN, 0.35 * goal] },
      { id: 'c3', ok: cohorts.pro.total <= 1.3 * goal, detail: [cohorts.pro.total, 1.3 * goal] },
      { id: 'c4', ok: cohorts.avg.total && this.earned(P, d, mid) >= goal / 3, detail: [this.earned(P, d, mid), goal / 3] },
      { id: 'c5', ok: P <= 50 * 40, detail: [P, 50 * 40] },
    ];
    return { goal, S, cohorts, series, checks, passed: checks.filter(c => c.ok).length };
  },
};
