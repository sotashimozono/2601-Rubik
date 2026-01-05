# 2601 Ribiks

## Motivations

これは以下の２つが発端となって始めたプロジェクト

- julia で群論、代数学を取り扱いたい
  - Oscar.jl / GAP.jl を使ってみたい
- julia で web アプリを作ることができるのか

代数学を取り扱う対象として、ルービックキューブが群論で記述できるということを思い出し、それで取り掛かることに。自分の勉強を兼ねて、webアプリは React/Three.js などの洗練されたコンポーネントを使用し、バックエンドの群論の記述、回転操作を julia で担当する。というような設計を目指している。  
なお、設計には gemini の力を大きく借りている。とはいえバグがいっぱいあったり、数理的な構造とかでは頼りないのでreactやwebフレームワークの設計が彼の主な役割である。

## TechStack

| Purpose | Tools |
| -- | -- |  
| Algebra Engine | Julia (GAP.jl) |
| Backend API | Oxygen.jl / HTTP.jl |
| Frontend UI | React / TypeScript / Vite |
| 3D Rendering | Three.js |

## Log

- 260104 : ルービックキューブをウェブ上に描画するところまで
- 260105 : julia/react間のデータのやり取りとかをある程度書いた
  - Achievement : キューブの回転操作、色の指定などを大方矛盾なく設計できた
  - Issue : julia でルービックキューブを解くという操作のハードルが意外と高い。何度もここのバグで躓いている
  - Challenges : 現在はjulia側とreact側のそれぞれでサーバーを立ち上げている。
    - ターミナル2台で julia server.jl / npm run dev の2つを走らせている。
    - これを一つの interface で管理できるといいね
