<div align="center">

# DualMind: Towards Understanding Cognitive-Affective Cascades in Public Opinion Dissemination via Multi-Agent Simulation

<a href="https://www2026.thewebconf.org/">
    <img src="https://img.shields.io/badge/WWW_2026-Demo_Track-8A2BE2?style=for-the-badge&logo=worldwideweb" alt="WWW 2026">
</a>

<br>

[Enhao Huang](LINK)\*, [Tongtong Pan](LINK)\*, [Shuhuai Zhang](LINK)\*, [Qishu Jin](LINK), [Liheng Zhen](LINK), [Kaichun Hu](LINK), [Yiming Li](LINK) $^\dagger$, [Zhan Qin](LINK), [Kui Ren](LINK)

(* Equal Contribution, $^\dagger$ Corresponding Author)


[![Paper](https://img.shields.io/badge/Paper-Arxiv-b31b1b.svg)](你的Arxiv链接) 
[![Video](https://img.shields.io/badge/Video-YouTube-red.svg)](https://youtu.be/ko0TTCcWn-I)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

---

## 📅 Roadmap & Status

**Current Progress:** `[████░░░░░░]` **40%**

| Milestone | ETA | Status |
| :--- | :--- | :--- |
| **1. Core Implementation** <br> (Backend, Agent Logic, & Dataset) | ~ 2026.02.20 | ✅ *Completed* |
| **2. Demo Video** <br> (System walkthrough & Visualizations) | ~ 2026.03.10 | 🚧 *In Progress* |
| **3. Full System Release** <br> (Industrial-ready Frontend & Deployment) | ~ 2026.03.20 | ⏳ *Pending* |

---

## 📢 News
- **[2026.01]** 🎉 DualMind has been accepted by **The Web Conference (WWW) 2026 (Demo Track)**!

## 🚧 Code & Data Release
This repository will host the official implementation of **DualMind**, including:
1. The **Multi-Agent Simulation Backend** (FastAPI + LangChain).
2. The **Interactive Frontend** (React + Ant Design).
3. The **Curated Dataset** of 15 real-world PR crises (post-Aug 2024).

> **The source code is scheduled to be released before February 20, 2026.** > Please star 🌟 this repo to stay tuned!

## 🖼️ System Overview
DualMind is an LLM-driven multi-agent simulation platform that models the interplay between rapidly fluctuating emotions and the slower evolution of cognitive states.

<p align="center">
  <img src="https://picui.ogmua.cn/s1/2026/03/06/69aa53553b1be.webp" alt="DualMind Interface" width="100%">
  <br>
  <em>Figure 1: The DualMind Interactive Interface (Strategy Rehearsal Sandbox).</em>
</p>

## 📝 Abstract
The diffusion of public opinion during PR crises is highly volatile and remains difficult to forecast. Existing simulation frameworks typically overlook the complex interaction between transient affective responses and persistent cognitive beliefs. To address this limitation, we present **DualMind**, a new LLM-driven multi-agent simulation platform. DualMind introduces a dual-component architecture that explicitly models the interplay between rapidly fluctuating emotions and the slower evolution of cognitive states across heterogeneous agent personas. We evaluate the system on 15 real-world crises that occurred after the LLMs' knowledge cutoff (August 2024) to eliminate data contamination. Empirical results show that DualMind faithfully reconstructs real-world opinion trajectories and eventual outcomes, substantially outperforming state-of-the-art baselines. This work provides a scalable, high-fidelity tool for proactive crisis management and potentially advances the methodological foundation for computational social science.

## 🎥 Demo Video
Video is available at [Here](https://youtu.be/ko0TTCcWn-I)

## 🖊️ Citation
If you find our work helpful, please cite:

```bibtex
@inproceedings{huang2026dualmind,
  title={DualMind: Towards Understanding Cognitive-Affective Cascades in Public Opinion Dissemination via Multi-Agent Simulation},
  author={Huang, Enhao and Pan, Tongtong and Zhang, Shuhuai and Jin, Qishu and Zhen, Liheng and Hu, Kaichun and Li, Yiming and Qin, Zhan and Ren, Kui},
  booktitle={Companion Proceedings of the Web Conference 2026 (WWW '26)},
  year={2026},
  publisher={ACM}
}
