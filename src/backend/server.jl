using Oxygen
using HTTP
using JSON3
using GAP

include("solver.jl") 

# 設定ファイルのパス
const SOLVE_PATH = "../config/solve.json"
const CONFIG_PATH = "../config/config.json"

function cors_middleware(handler)
    return function(req::HTTP.Request)
        # プリフライト（OPTIONS）リクエストへの即答
        if HTTP.method(req) == "OPTIONS"
            return HTTP.Response(200, [
                "Access-Control-Allow-Origin" => "*",
                "Access-Control-Allow-Methods" => "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers" => "*"
            ])
        end
        res = handler(req)
        # 通常のレスポンスにヘッダーを付加
        HTTP.setheader(res, "Access-Control-Allow-Origin" => "*")
        return res
    end
end

@post "/apply-moves" function(req::HTTP.Request)
    try
        data = JSON3.read(req.body)
        moves_to_apply = data.moves
        println("📩 Applying moves: ", moves_to_apply)

        # 1. 現在の状態をロード
        current_data = JSON3.read(read(SOLVE_PATH, String))
        state = Vector{Int}(current_data.current)

        # 2. 手順を順次適用（GAPによる群作用の計算）
        for m in moves_to_apply
            # solver.jl 内の関数で状態ベクトルを置換
            state = apply_move_to_state(state, moves[m])
        end

        # 3. solve.json に書き出し
        new_data = Dict(
            "current" => state,
            "scramble" => current_data.scramble,
            "solution" => current_data.solution
        )
        
        open(SOLVE_PATH, "w") do f
            JSON3.pretty(f, new_data)
        end

        return Dict("status" => "success", "moves" => moves_to_apply)
    catch e
        @error "Error applying moves" exception=(e, catch_backtrace())
        return HTTP.Response(500, "Internal Server Error")
    end
end

serve(host="0.0.0.0", port=8080, middleware=[cors_middleware])