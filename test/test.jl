using GAP

mutable struct RubikCube
    state::Vector{Int}
    operators::Dict{String, Any}
    hom::Any
end

function apply_moves!(cube::RubikCube, move_names::Vector{String})
    for m in move_names
        m = strip(m)
        if isempty(m) continue end
        is_inverse = endswith(m, "-") || endswith(m, "'")
        base_move = is_inverse ? m[1:end-1] : m
        
        perm = get(cube.operators, base_move, nothing)
        if perm === nothing continue end
        actual_perm = is_inverse ? inv(perm) : perm
        
        # マッピング計算 (i^P)
        p_map = [Int(i^actual_perm) for i in 1:48]
        
        # 更新ロジックの反転
        next_state = copy(cube.state)
        for i in 1:48
            next_state[i] = cube.state[p_map[i]]
        end
        cube.state = next_state
    end
end

function gap_to_lsystem(word_str::String)
    res = replace(word_str, "*" => " ", "(" => "", ")" => "")
    final_moves = String[]
    for p in split(res)
        m = match(r"([A-Z])(?:\^?([\-\d]+))?", p)
        if m === nothing continue end
        face, pow_str = m.captures[1], m.captures[2]
        pow = pow_str === nothing ? 1 : parse(Int, pow_str)
        pow = pow % 4
        if pow < 0 pow += 4 end
        if pow == 1 push!(final_moves, face)
        elseif pow == 2 (push!(final_moves, face); push!(final_moves, face))
        elseif pow == 3 push!(final_moves, face * "-")
        end
    end
    return final_moves
end

function create_hom(ops)
    names_gap = GAP.evalstr("[\"U\", \"L\", \"F\", \"R\", \"B\", \"D\"]")
    gen_list = [ops[n] for n in ["U", "L", "F", "R", "B", "D"]]
    free = (@gap FreeGroup)(names_gap)
    cube_grp = (@gap Group)(gen_list...)
    return (@gap GroupHomomorphismByImages)(free, cube_grp, (@gap GeneratorsOfGroup)(free), (@gap GeneratorsOfGroup)(cube_grp))
end

function find_solution(cube::RubikCube)
    # 1. 物理状態から置換 g を作成
    # Logic Type-B では、PermList(state) がそのまま「現在の置換 P」を表します。
    gap_list = GAP.evalstr("[" * join(cube.state, ",") * "]")
    g = (@gap PermList)(gap_list)
    
    # 2. 現在の置換 P を打ち消すには、逆元 inv(P) が必要
    # 非常に素直な論理になります。
    word = (@gap PreImagesRepresentative)(cube.hom, inv(g))
    
    word_raw = String((@gap String)(word))
    return gap_to_lsystem(word_raw)
end

# --- 2. 実行・検証セクション ---

operators = Dict(
    "U" => @gap((1,3,8,6)*(2,5,7,4)*(9,33,25,17)*(10,34,26,18)*(11,35,27,19)),
    "L" => @gap((9,11,16,14)*(10,13,15,12)*(1,17,41,40)*(4,20,44,37)*(6,22,46,35)),
    "F" => @gap((17,19,24,22)*(18,21,23,20)*(6,25,43,16)*(7,28,42,13)*(8,30,41,11)),
    "R" => @gap((25,27,32,30)*(26,29,31,28)*(3,38,43,19)*(5,36,45,21)*(8,33,48,24)),
    "B" => @gap((33,35,40,38)*(34,37,39,36)*(3,9,46,32)*(2,12,47,29)*(1,14,48,27)),
    "D" => @gap((41,43,48,46)*(42,45,47,44)*(14,22,30,38)*(15,23,31,39)*(16,24,32,40))
)

cube = RubikCube(collect(1:48), operators, create_hom(operators))

println("1. Scrambling...")
scramble = [rand(["U", "D", "L", "R", "F", "B", "U-", "D-", "L-", "R-", "F-", "B-"]) for _ in 1:20]
println("Scramble: ", join(scramble, " "))
apply_moves!(cube, scramble)

println("\n2. Finding Solution...")
sol = find_solution(cube)
println("Solution: ", join(sol, " "))

println("\n3. Applying Solution...")
apply_moves!(cube, sol)

println("\n--- Result ---")
if cube.state == collect(1:48)
    println("SUCCESS: Cube is perfectly solved!")
else
    println("FAILED: Logic mismatch.")
    println("Mismatch: ", findall(i -> cube.state[i] != i, 1:48))
end
