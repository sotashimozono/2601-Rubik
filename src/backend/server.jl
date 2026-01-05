using Oxygen
using HTTP
using JSON3
using GAP

# 完成した solver.jl をインクルード
include("solver.jl") 

# --- 1. パス設定 ---
const BASE_DIR = @__DIR__ 
const SOLVE_PATH = joinpath(BASE_DIR, "..", "config", "solve.json")
const CONFIG_PATH = joinpath(BASE_DIR, "..", "config", "config.json")
const DISPLAY_PATH = joinpath(BASE_DIR, "..", "config", "display.json")

# --- 2. 初期化 ---
# 起動時に一度だけ RubikCube インスタンスを作成
const my_cube = RubikCube(CONFIG_PATH, SOLVE_PATH)

# --- 3. CORS ミドルウェア ---
# React (Vite) 等からのクロスオリジンリクエストを許可
function cors_middleware(handler)
    return function(req::HTTP.Request)
        if HTTP.method(req) == "OPTIONS"
            return HTTP.Response(200, [
                "Access-Control-Allow-Origin" => "*",
                "Access-Control-Allow-Methods" => "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers" => "*",
                "Access-Control-Max-Age" => "86400"
            ])
        end
        
        response = handler(req)
        res = response isa HTTP.Response ? response : HTTP.Response(200, JSON3.write(response))
        
        HTTP.setheader(res, "Access-Control-Allow-Origin" => "*")
        HTTP.setheader(res, "Content-Type" => "application/json")
        return res
    end
end

# --- 4. エンドポイント定義 ---

# A. 現在の状態を取得
@get "/get-state" function(req::HTTP.Request)
    # 最新の solver.jl では find_solution は String 配列を返す
    sol_moves = find_solution(my_cube)
    
    return Dict(
        "current" => my_cube.state,
        "scramble" => "", # 必要に応じて保持
        "solution" => join(sol_moves, " ") # スペース区切りの文字列で返す
    )
end

# B. 移動を実行 (Reactからの入力を処理)
@post "/apply-moves" function(req::HTTP.Request)
    try
        body = JSON3.read(req.body)
        moves = Vector{String}(body.moves)
        
        # solver.jl の apply_moves! は中間状態の履歴 (Vector{Vector{Int}}) を返す
        history = apply_moves!(my_cube, moves)
        
        # 状態を solve.json に保存して永続化
        save_data = Dict("current" => my_cube.state, "scramble" => "")
        open(SOLVE_PATH, "w") do f; JSON3.pretty(f, save_data); end

        return Dict(
            "status" => "success", 
            "history" => history, 
            "current" => my_cube.state
        )
    catch e
        @error "Apply Moves Error" exception=(e, catch_backtrace())
        return HTTP.Response(500, "Error during move application")
    end
end

# C. ランダムシャッフル
@post "/scramble" function(req::HTTP.Request)
    try
        # ソルバーが解釈できる記号 (- を使用) に統一
        moves_pool = ["U", "D", "L", "R", "F", "B", "U-", "D-", "L-", "R-", "F-", "B-"]
        scramble_moves = [rand(moves_pool) for _ in 1:20]
        
        # 移動実行と履歴取得
        history = apply_moves!(my_cube, scramble_moves)
        
        # 保存
        save_data = Dict("current" => my_cube.state, "scramble" => join(scramble_moves, " "))
        open(SOLVE_PATH, "w") do f; JSON3.pretty(f, save_data); end
        
        return Dict(
            "status" => "success", 
            "moves" => scramble_moves, 
            "history" => history, 
            "current" => my_cube.state
        )
    catch e
        @error "Scramble Error" exception=(e, catch_backtrace())
        return HTTP.Response(500, "Internal Server Error")
    end
end

# D. 解法を計算
@get "/solve" function(req::HTTP.Request)
    try
        # solver.jl の find_solution を実行
        sol_moves = find_solution(my_cube)
        return Dict("solution" => join(sol_moves, " "))
    catch e
        @error "Solve Error" exception=(e, catch_backtrace())
        return HTTP.Response(500, "Solver Error")
    end
end

# E. 設定更新
@post "/update-settings" function(req::HTTP.Request)
    try
        new_settings = JSON3.read(req.body)
        current_settings = JSON3.read(read(DISPLAY_PATH, String), Dict)
        merge!(current_settings, Dict(new_settings))
        
        open(DISPLAY_PATH, "w") do f
            JSON3.pretty(f, current_settings)
        end
        return Dict("status" => "success")
    catch e
        return HTTP.Response(500, "Failed to update settings")
    end
end

# --- 5. サーバー起動 ---
# revise=true で開発中のコード変更を自動反映
serve(host="0.0.0.0", port=8080, middleware=[cors_middleware], revise=true)