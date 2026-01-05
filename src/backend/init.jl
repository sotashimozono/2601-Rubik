# dev/init.jl
using JSON3

function initialize_cube_system()
    println("=== Rubik Solver System Initializing... ===")
    
    base = @__DIR__
    config_path = joinpath(base, "../config/config.json")
    solve_path = joinpath(base, "../config/solve.json")
    
    if !isfile(config_path)
        error("Config file not found at $config_path")
    end

    solved_state = collect(1:48)

    # 2. データのパッキング
    solve_data = Dict(
        "current" => solved_state,
        "scramble" => "",
        "solution" => "",
        "timestamp" => time() # 初期化時刻を記録
    )

    # 3. JSONへの出力
    open(solve_path, "w") do f
        JSON3.pretty(f, solve_data)
    end

    println("Success: Cube has been reset to SOLVED state.")
    println("File created: $solve_path")
end

initialize_cube_system()