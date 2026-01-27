import { Command } from "commander";

type ShellType = "fish" | "bash" | "zsh";

/**
 * シェル補完スクリプトを生成するコマンド
 */
export function completionsCommand(): Command {
  return new Command("completions")
    .description("シェル補完スクリプトを生成します")
    .argument("<shell>", "シェルタイプ (fish, bash, zsh)")
    .action((shell: string) => {
      const shellType = shell.toLowerCase() as ShellType;

      switch (shellType) {
        case "fish":
          console.log(generateFishCompletions());
          break;
        case "bash":
          console.log(generateBashCompletions());
          break;
        case "zsh":
          console.log(generateZshCompletions());
          break;
        default:
          console.error(`未対応のシェル: ${shell}`);
          console.error("対応シェル: fish, bash, zsh");
          process.exit(1);
      }
    });
}

/**
 * Fish シェル用の補完スクリプトを生成
 */
function generateFishCompletions(): string {
  return `# ergon fish completions
# Usage: source (ergon completions fish | psub)
# Or add to ~/.config/fish/config.fish:
#   source (ergon completions fish | psub)

# Disable file completions for ergon
complete -c ergon -f

# Main subcommands
complete -c ergon -n "__fish_use_subcommand" -a "image" -d "画像生成・編集・説明"
complete -c ergon -n "__fish_use_subcommand" -a "video" -d "動画生成"
complete -c ergon -n "__fish_use_subcommand" -a "narration" -d "音声生成"
complete -c ergon -n "__fish_use_subcommand" -a "preset" -d "プリセット管理"
complete -c ergon -n "__fish_use_subcommand" -a "configure" -d "設定"
complete -c ergon -n "__fish_use_subcommand" -a "log" -d "ログ表示"
complete -c ergon -n "__fish_use_subcommand" -a "completions" -d "補完スクリプト生成"

# image subcommands
complete -c ergon -n "__fish_seen_subcommand_from image" -a "gen" -d "画像生成"
complete -c ergon -n "__fish_seen_subcommand_from image" -a "edit" -d "画像編集"
complete -c ergon -n "__fish_seen_subcommand_from image" -a "explain" -d "画像説明"

# image gen options
complete -c ergon -n "__fish_seen_subcommand_from image; and __fish_seen_subcommand_from gen" -s a -l aspect-ratio -d "アスペクト比" -xa "16:9 4:3 1:1 9:16 3:4"
complete -c ergon -n "__fish_seen_subcommand_from image; and __fish_seen_subcommand_from gen" -s e -l engine -d "画像エンジン" -xa "imagen4 imagen4-fast imagen4-ultra nano-banana nano-banana-pro"
complete -c ergon -n "__fish_seen_subcommand_from image; and __fish_seen_subcommand_from gen" -s f -l format -d "フォーマット" -xa "webp png jpg"
complete -c ergon -n "__fish_seen_subcommand_from image; and __fish_seen_subcommand_from gen" -s o -l output -d "出力ファイル"
complete -c ergon -n "__fish_seen_subcommand_from image; and __fish_seen_subcommand_from gen" -s p -l preset -d "プリセット"
complete -c ergon -n "__fish_seen_subcommand_from image; and __fish_seen_subcommand_from gen" -s n -l count -d "生成枚数"

# image edit options
complete -c ergon -n "__fish_seen_subcommand_from image; and __fish_seen_subcommand_from edit" -s o -l output -d "出力ファイル"
complete -c ergon -n "__fish_seen_subcommand_from image; and __fish_seen_subcommand_from edit" -s e -l engine -d "画像エンジン" -xa "nano-banana nano-banana-pro"

# image explain options
complete -c ergon -n "__fish_seen_subcommand_from image; and __fish_seen_subcommand_from explain" -s l -l lang -d "出力言語" -xa "ja en zh ko"

# video subcommands
complete -c ergon -n "__fish_seen_subcommand_from video" -a "gen" -d "動画生成"

# video gen options
complete -c ergon -n "__fish_seen_subcommand_from video; and __fish_seen_subcommand_from gen" -s a -l aspect-ratio -d "アスペクト比" -xa "16:9 9:16"
complete -c ergon -n "__fish_seen_subcommand_from video; and __fish_seen_subcommand_from gen" -s d -l duration -d "動画の長さ" -xa "5 10"
complete -c ergon -n "__fish_seen_subcommand_from video; and __fish_seen_subcommand_from gen" -s o -l output -d "出力ファイル"
complete -c ergon -n "__fish_seen_subcommand_from video; and __fish_seen_subcommand_from gen" -s i -l image -d "入力画像ファイル"

# narration subcommands
complete -c ergon -n "__fish_seen_subcommand_from narration" -a "gen" -d "音声生成"

# narration gen options
complete -c ergon -n "__fish_seen_subcommand_from narration; and __fish_seen_subcommand_from gen" -s v -l voice -d "音声" -xa "Kore Aoede Charon Fenrir Puck"
complete -c ergon -n "__fish_seen_subcommand_from narration; and __fish_seen_subcommand_from gen" -s o -l output -d "出力ファイル"
complete -c ergon -n "__fish_seen_subcommand_from narration; and __fish_seen_subcommand_from gen" -s c -l character -d "キャラクター設定"

# preset subcommands
complete -c ergon -n "__fish_seen_subcommand_from preset" -a "list" -d "プリセット一覧"
complete -c ergon -n "__fish_seen_subcommand_from preset" -a "save" -d "プリセット保存"
complete -c ergon -n "__fish_seen_subcommand_from preset" -a "delete" -d "プリセット削除"

# preset list options
complete -c ergon -n "__fish_seen_subcommand_from preset; and __fish_seen_subcommand_from list" -l json -d "JSON形式で出力"

# preset save options
complete -c ergon -n "__fish_seen_subcommand_from preset; and __fish_seen_subcommand_from save" -s a -l aspect-ratio -d "アスペクト比"
complete -c ergon -n "__fish_seen_subcommand_from preset; and __fish_seen_subcommand_from save" -s t -l type -d "画像タイプ"
complete -c ergon -n "__fish_seen_subcommand_from preset; and __fish_seen_subcommand_from save" -s e -l engine -d "画像エンジン"
complete -c ergon -n "__fish_seen_subcommand_from preset; and __fish_seen_subcommand_from save" -s f -l format -d "画像フォーマット"
complete -c ergon -n "__fish_seen_subcommand_from preset; and __fish_seen_subcommand_from save" -s s -l size -d "画像サイズ"
complete -c ergon -n "__fish_seen_subcommand_from preset; and __fish_seen_subcommand_from save" -s q -l quality -d "画像品質"

# configure options
complete -c ergon -n "__fish_seen_subcommand_from configure" -l show -d "現在の設定を表示"
complete -c ergon -n "__fish_seen_subcommand_from configure" -l reset -d "設定をリセット"

# log options
complete -c ergon -n "__fish_seen_subcommand_from log" -s n -l lines -d "表示する行数"
complete -c ergon -n "__fish_seen_subcommand_from log" -s l -l level -d "ログレベル" -xa "debug info warn error"
complete -c ergon -n "__fish_seen_subcommand_from log" -l mcp -d "MCPサーバーのログのみ表示"

# completions subcommand
complete -c ergon -n "__fish_seen_subcommand_from completions" -a "fish" -d "Fish shell"
complete -c ergon -n "__fish_seen_subcommand_from completions" -a "bash" -d "Bash shell"
complete -c ergon -n "__fish_seen_subcommand_from completions" -a "zsh" -d "Zsh shell"
`;
}

/**
 * Bash シェル用の補完スクリプトを生成
 */
function generateBashCompletions(): string {
  return `# ergon bash completions
# Usage: eval "$(ergon completions bash)"
# Or add to ~/.bashrc:
#   eval "$(ergon completions bash)"

_ergon_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="image video narration preset configure log completions"
    local image_commands="gen edit explain"
    local video_commands="gen"
    local narration_commands="gen"
    local preset_commands="list save delete"
    local completions_commands="fish bash zsh"

    case "\${words[1]}" in
        image)
            case "\${words[2]}" in
                gen)
                    COMPREPLY=($(compgen -W "-a --aspect-ratio -e --engine -f --format -o --output -p --preset -n --count" -- "\$cur"))
                    ;;
                edit)
                    COMPREPLY=($(compgen -W "-o --output -e --engine" -- "\$cur"))
                    ;;
                explain)
                    COMPREPLY=($(compgen -W "-l --lang" -- "\$cur"))
                    ;;
                *)
                    COMPREPLY=($(compgen -W "\$image_commands" -- "\$cur"))
                    ;;
            esac
            ;;
        video)
            case "\${words[2]}" in
                gen)
                    COMPREPLY=($(compgen -W "-a --aspect-ratio -d --duration -o --output -i --image" -- "\$cur"))
                    ;;
                *)
                    COMPREPLY=($(compgen -W "\$video_commands" -- "\$cur"))
                    ;;
            esac
            ;;
        narration)
            case "\${words[2]}" in
                gen)
                    COMPREPLY=($(compgen -W "-v --voice -o --output -c --character" -- "\$cur"))
                    ;;
                *)
                    COMPREPLY=($(compgen -W "\$narration_commands" -- "\$cur"))
                    ;;
            esac
            ;;
        preset)
            case "\${words[2]}" in
                list)
                    COMPREPLY=($(compgen -W "--json" -- "\$cur"))
                    ;;
                save)
                    COMPREPLY=($(compgen -W "-a --aspect-ratio -t --type -e --engine -f --format -s --size -q --quality" -- "\$cur"))
                    ;;
                *)
                    COMPREPLY=($(compgen -W "\$preset_commands" -- "\$cur"))
                    ;;
            esac
            ;;
        configure)
            COMPREPLY=($(compgen -W "--show --reset" -- "\$cur"))
            ;;
        log)
            COMPREPLY=($(compgen -W "-n --lines -l --level --mcp" -- "\$cur"))
            ;;
        completions)
            COMPREPLY=($(compgen -W "\$completions_commands" -- "\$cur"))
            ;;
        *)
            COMPREPLY=($(compgen -W "\$commands" -- "\$cur"))
            ;;
    esac
}

complete -F _ergon_completions ergon
`;
}

/**
 * Zsh シェル用の補完スクリプトを生成
 */
function generateZshCompletions(): string {
  return `#compdef ergon

# ergon zsh completions
# Usage: eval "$(ergon completions zsh)"
# Or add to ~/.zshrc:
#   eval "$(ergon completions zsh)"

_ergon() {
    local -a commands
    commands=(
        'image:画像生成・編集・説明'
        'video:動画生成'
        'narration:音声生成'
        'preset:プリセット管理'
        'configure:設定'
        'log:ログ表示'
        'completions:補完スクリプト生成'
    )

    local -a image_commands
    image_commands=(
        'gen:画像生成'
        'edit:画像編集'
        'explain:画像説明'
    )

    local -a video_commands
    video_commands=(
        'gen:動画生成'
    )

    local -a narration_commands
    narration_commands=(
        'gen:音声生成'
    )

    local -a preset_commands
    preset_commands=(
        'list:プリセット一覧'
        'save:プリセット保存'
        'delete:プリセット削除'
    )

    local -a completions_commands
    completions_commands=(
        'fish:Fish shell'
        'bash:Bash shell'
        'zsh:Zsh shell'
    )

    _arguments -C \\
        '1: :->command' \\
        '*:: :->args'

    case \$state in
        command)
            _describe -t commands 'ergon command' commands
            ;;
        args)
            case \$words[1] in
                image)
                    _arguments -C \\
                        '1: :->subcommand' \\
                        '*:: :->subopts'
                    case \$state in
                        subcommand)
                            _describe -t commands 'image subcommand' image_commands
                            ;;
                        subopts)
                            case \$words[1] in
                                gen)
                                    _arguments \\
                                        '-a[アスペクト比]:ratio:(16:9 4:3 1:1 9:16 3:4)' \\
                                        '--aspect-ratio[アスペクト比]:ratio:(16:9 4:3 1:1 9:16 3:4)' \\
                                        '-e[画像エンジン]:engine:(imagen4 imagen4-fast imagen4-ultra nano-banana nano-banana-pro)' \\
                                        '--engine[画像エンジン]:engine:(imagen4 imagen4-fast imagen4-ultra nano-banana nano-banana-pro)' \\
                                        '-f[フォーマット]:format:(webp png jpg)' \\
                                        '--format[フォーマット]:format:(webp png jpg)' \\
                                        '-o[出力ファイル]:file:_files' \\
                                        '--output[出力ファイル]:file:_files' \\
                                        '-p[プリセット]:preset:' \\
                                        '--preset[プリセット]:preset:' \\
                                        '-n[生成枚数]:count:' \\
                                        '--count[生成枚数]:count:'
                                    ;;
                                edit)
                                    _arguments \\
                                        '-o[出力ファイル]:file:_files' \\
                                        '--output[出力ファイル]:file:_files' \\
                                        '-e[画像エンジン]:engine:(nano-banana nano-banana-pro)' \\
                                        '--engine[画像エンジン]:engine:(nano-banana nano-banana-pro)' \\
                                        '1:input file:_files'
                                    ;;
                                explain)
                                    _arguments \\
                                        '-l[出力言語]:lang:(ja en zh ko)' \\
                                        '--lang[出力言語]:lang:(ja en zh ko)' \\
                                        '1:input file:_files'
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                video)
                    _arguments -C \\
                        '1: :->subcommand' \\
                        '*:: :->subopts'
                    case \$state in
                        subcommand)
                            _describe -t commands 'video subcommand' video_commands
                            ;;
                        subopts)
                            case \$words[1] in
                                gen)
                                    _arguments \\
                                        '-a[アスペクト比]:ratio:(16:9 9:16)' \\
                                        '--aspect-ratio[アスペクト比]:ratio:(16:9 9:16)' \\
                                        '-d[動画の長さ]:duration:(5 10)' \\
                                        '--duration[動画の長さ]:duration:(5 10)' \\
                                        '-o[出力ファイル]:file:_files' \\
                                        '--output[出力ファイル]:file:_files' \\
                                        '-i[入力画像]:file:_files' \\
                                        '--image[入力画像]:file:_files'
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                narration)
                    _arguments -C \\
                        '1: :->subcommand' \\
                        '*:: :->subopts'
                    case \$state in
                        subcommand)
                            _describe -t commands 'narration subcommand' narration_commands
                            ;;
                        subopts)
                            case \$words[1] in
                                gen)
                                    _arguments \\
                                        '-v[音声]:voice:(Kore Aoede Charon Fenrir Puck)' \\
                                        '--voice[音声]:voice:(Kore Aoede Charon Fenrir Puck)' \\
                                        '-o[出力ファイル]:file:_files' \\
                                        '--output[出力ファイル]:file:_files' \\
                                        '-c[キャラクター設定]:character:' \\
                                        '--character[キャラクター設定]:character:'
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                preset)
                    _arguments -C \\
                        '1: :->subcommand' \\
                        '*:: :->subopts'
                    case \$state in
                        subcommand)
                            _describe -t commands 'preset subcommand' preset_commands
                            ;;
                        subopts)
                            case \$words[1] in
                                list)
                                    _arguments '--json[JSON形式で出力]'
                                    ;;
                                save)
                                    _arguments \\
                                        '-a[アスペクト比]:ratio:' \\
                                        '--aspect-ratio[アスペクト比]:ratio:' \\
                                        '-t[画像タイプ]:type:' \\
                                        '--type[画像タイプ]:type:' \\
                                        '-e[画像エンジン]:engine:' \\
                                        '--engine[画像エンジン]:engine:' \\
                                        '-f[フォーマット]:format:' \\
                                        '--format[フォーマット]:format:' \\
                                        '-s[サイズ]:size:' \\
                                        '--size[サイズ]:size:' \\
                                        '-q[品質]:quality:'
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                configure)
                    _arguments \\
                        '--show[現在の設定を表示]' \\
                        '--reset[設定をリセット]'
                    ;;
                log)
                    _arguments \\
                        '-n[表示する行数]:lines:' \\
                        '--lines[表示する行数]:lines:' \\
                        '-l[ログレベル]:level:(debug info warn error)' \\
                        '--level[ログレベル]:level:(debug info warn error)' \\
                        '--mcp[MCPサーバーのログのみ表示]'
                    ;;
                completions)
                    _describe -t commands 'shell type' completions_commands
                    ;;
            esac
            ;;
    esac
}

_ergon
`;
}
