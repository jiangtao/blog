---
title: "What I Have Seen in AI Delivery Recently"
pubDatetime: 2026-06-02T09:00:00.000Z
tags:
  - ai
  - product engineering
  - end-to-end delivery
  - organizational change
draft: false
description: "AI coding increases the leverage of end-to-end delivery, but it also accelerates requests, experiments, and change. When value validation and delivery capacity do not keep pace, engineering teams carry more pressure rather than less."
cover: /images/i18n/en/blog-covers/ai-native-delivery-cover.svg
locale: en
translationKey: ai-native-delivery
---

## Conclusion

I was surprised to find that this blog is still active and still has readers.

This post was written on a phone, so I will keep it focused. My conclusion is straightforward: **in the AI era, roles such as FDE and PDE use AI coding to increase the leverage of end-to-end delivery, yet engineering teams often work harder while receiving less of the benefit than they did before.**

The root cause is that **AI speeds up how quickly the demand side can propose requests, experiment, and change direction, while neither the value of those requests nor the production system's capacity to absorb them is validated at the same pace.** The organization may then conclude that it needs fewer people or make layoffs directly. Over-hiring after the pandemic can also be part of the context.

<!--more-->

First, a quick clarification of the role names. In English, FDE usually means `Forward Deployed Engineer`. In many AI-native organizations, PDE may refer to a product development engineer or product engineer. The names vary by company, but they point to the same idea: **work closer to the business, own an outcome end to end, and use AI as a production multiplier.**

![An imbalance in end-to-end delivery in the AI era and how to govern it](/images/i18n/en/misc/ai-native-delivery-flow.svg)

## Breaking Down End-to-End Delivery in the AI Era

Start with delivery before AI.

A complete collaboration cycle usually includes:

1. **Request definition**: business needs, current context, product research, value confirmation, and the resulting requirement. A PM typically owns this step.
2. **Requirement review**: the technical review includes frontend, backend, QA, and other stakeholders. Here, frontend includes web, client, H5, and related surfaces. After alignment, each party takes its follow-up work.
3. **Technical review**: document the key design, align internally, review it, and schedule the work. This is critical for backward compatibility, technology evolution, quality assurance, and team cadence.
4. **Execution**: after the design and review are complete, engineering proceeds at a planned pace. When risk estimates turn out to be wrong, surface the risk early and adjust together.
5. **Pre-delivery**: once all parties finish their work, the change becomes deliverable. QA resolves several rounds of issues and bugs; test environments and monitoring must be ready; then the team prepares a release plan.
6. **Release**: validate with allowlists and gradual rollout, then continuously observe monitoring and alerts. Continue when healthy; otherwise feed the signal back into remediation until the release is complete.

Why did delivery need this process? Not because people enjoy meetings. Software delivery needs a way to preserve quality across complex collaboration. In multi-person, multi-platform, and multi-system work, the process absorbs risk: whether the request has value, whether the design remains compatible with history, how quality is assured, and how production behavior is observed.

The process can look slow, but it represents an organization's capacity to absorb risk.

## Three Patterns I See in the AI Era

The process has not disappeared. Instead, several new patterns have emerged within the existing organizational structure. I have discussed and encountered these three most often.

### 1. The Production Side Is Overloaded

When AI coding first appeared, engineering teams could imagine a simple outcome: finish earlier and rest earlier.

The tools improved, individual productivity rose, and the local benefit was obvious. At that stage, AI seemed to reduce engineering workload. In practice, organizations quickly consume that benefit.

Previously, a request needed scheduling, reviews, and available capacity. Now AI can fill in code, produce demos, and support rapid experiments. Engineering output is faster. But writing code is not the only human cost in end-to-end delivery. Teams still need to judge requests, preserve historical compatibility, split systems, integrate and test, stage and roll back releases, operate monitoring and alerts, and own production outcomes.

Accelerating coding does not accelerate the entire delivery system at the same rate. Production actions become faster while the work that absorbs them does not, so engineering teams become more exhausted.

### 2. The Demand Side Wants to "Do More"

The second pattern is on the demand side.

PMs and leaders naturally form a judgment like this:

> AI is available, so let us try more. If it does not work, we can change it.

This is realistic. AI lowers the cost of a demo and gives the demand side faster short-term feedback. In the past, a costly idea was more likely to be evaluated cautiously before it reached engineering. Now AI can produce a demo, outline a solution, and support quick experiments. The pace of requests, experimentation, and change increases accordingly.

The problem is that faster proposal and experimentation do not necessarily mean more real value. If value grew at the same rate and at a sufficient level, the original organization might still work. More often, the rate of change rises while value validation and production capacity do not keep up.

AI can make a request look easier to validate without proving that it is valuable. It can make experimentation look cheaper without making quality, integration, rollout, or rollback cheap. The uncertainty ultimately lands on engineering and the delivery chain.

AI then becomes a tool for rapid organizational experimentation and visible output, while engineers become the people who absorb the consequences. That includes an implicit pressure: if you do not take the work, someone else will.

### 3. Engineering Expectations Deteriorate

The third pattern concerns people's expectations.

At first, AI gives engineers a positive expectation: higher productivity, less repetitive work, and earlier completion.

But if an organization uses AI only as an accelerator without upgrading request validation, quality platforms, or organizational boundaries, engineers quickly encounter another reality: not less work, but more requests, faster change, shorter feedback cycles, and greater pressure.

That is why I believe engineering teams are working harder while receiving less benefit than before.

Before AI, delivery was slower but more predictable. If the organization accelerates only production and does not govern demand and organizational systems, expectations are repeatedly broken. A tool that was expected to create freedom instead introduces more uncertainty to absorb.

### The Core Issue Is Not That AI Is Bad

This is not an argument against AI.

The leverage of AI coding is real, and the emergence of FDE- and PDE-like roles is a real trend. Stronger end-to-end delivery, converging frontend and backend boundaries, and engineering closer to the business are all positive developments.

The real issue is this: **an organization cannot consume AI's production gains without also upgrading value validation, its delivery ecosystem, and quality assurance.**

Looking only at production produces a simple conclusion: AI makes people faster, so fewer people are needed.

Looking at the complete delivery chain reveals a different reality. Requests, experiments, and change accelerate. Coding accelerates too. Reviews, collaboration, testing, release, monitoring, rollback, and people's ability to sustain the pressure do not necessarily accelerate with them.

That is the core tension behind these patterns.

| Observation | Change introduced by AI | Actual risk |
| --- | --- | --- |
| Production | Faster coding and demos | Other stages of delivery do not speed up at the same rate |
| Demand | Cheaper experiments and more ideas | Value validation lags; request churn and uncertainty increase |
| Engineering | Stronger individual tooling | More review, integration, release, and governance pressure |
| Organization | Short-term output is easier to see | Efficiency gains are easily converted into pressure or layoffs |

So the claim that "AI makes engineering more efficient" is only half right. A more complete statement is:

> AI improves local execution efficiency on the production side and accelerates requests, experiments, and change on the demand side. If value validation and production capacity do not keep up, the system shifts the extra uncertainty onto engineering.

## Governance: A Path to Improvement

How should this be governed?

My view is that **an AI-native organization is a top-down change.**

Giving every engineer an AI coding tool does not make an organization AI-native. A genuinely AI-native organization combines process integration, ecosystem integration, quality assurance, and organizational change.

### 1. Integrate the Process: Validate Demand Earlier

If AI can produce a demo, why not let product teams validate the value earlier?

User research, requirement definition, and requirement validation should all move forward. Many requests previously reached engineering review before their value was found to be unclear. Now that AI makes prototyping inexpensive, demand judgment should happen even earlier.

Engineering should not be the first team to absorb every uncertainty.

### 2. Integrate the Ecosystem: Put Agents in the Delivery System

The systems around delivery must also be integrated.

After a request is created, it should move into a requirements platform such as ONES, then synchronize with the issue tracker, scheduling system, code system, CI/CD, test system, and monitoring and alerting systems. Agents can inspect and govern work across these systems.

Ideally, an ordinary small request can be fixed, committed, reviewed, and verified by a code agent, then released with a larger version.

At that point, AI is no longer an isolated tool. It becomes an execution and governance node in the delivery chain.

### 3. Preserve Delivery Safeguards as Capacity Grows

Some companies want to merge engineering roles immediately, yet have no monitoring, alerting, or rollback platforms to protect the work.

Higher capacity does not remove the need for quality safeguards. Without them, AI only moves problems into production faster.

### 4. Upgrade the Organization: Flatten It Without Replacing Structure With Pressure

With process integration, ecosystem integration, and delivery safeguards in place, an organization can gradually become flatter.

From recent discussions, many companies are moving in that direction. The most extreme model uses only PDEs, who work directly with product or request owners and deliver end to end.

That direction can work. With AI support, merging frontend and backend responsibilities and strengthening both sides' capabilities can be viable.

But the pace of product and request changes must slow down in this model. AI may be able to handle more, but sustainable human capacity still matters.

Without earlier validation, quality platforms, stable observability, and clear boundaries, PDE becomes only a more flattering label for "everything is your responsibility."

### 5. Adjust People Thoughtfully: Learning Matters, and So Do Human Principles

Personnel changes are unavoidable under these conditions.

My view is that organizations should support people with strong learning capacity to keep learning, while also hiring people with AI delivery or AI-native experience where needed.

But workforce changes should not be presented only through an efficiency narrative. AI-driven organizational change affects many career paths. That makes it even more important to state the rules and transformation path clearly.

## Summary

AI can make output faster, but it does not automatically make requests more accurate or complete the delivery system.

Do not focus only on making engineering faster. The whole organization needs to accelerate together: validate value before implementation, constrain product churn, enable sustainable delivery, and use platforms and quality systems to protect monitoring, alerting, staged rollout, and rollback.

Over time, tokens, people, and infrastructure are all investments. The final question is still whether delivered requests produce positive conversion and value. Otherwise, the organization only creates more change faster while steadily consuming team morale, organizational stability, and delivery quality.
