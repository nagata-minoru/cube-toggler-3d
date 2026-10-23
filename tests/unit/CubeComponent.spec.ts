import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import * as THREE from 'three'
import CubeComponent from '@/components/CubeComponent.vue'

// jsdom では WebGL が使えないため, WebGLRenderer を描画内容を記録するだけの偽物に差し替える
const rendered = vi.hoisted(() => ({
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  setSize: [] as [number, number][],
}))

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof THREE>()

  class FakeWebGLRenderer {
    domElement = document.createElement('canvas')
    shadowMap = { enabled: false }
    setSize = (width: number, height: number) => rendered.setSize.push([width, height])
    setClearColor = vi.fn()
    // 本物のレンダラと同様に, 描画時にワールド行列を更新する
    render = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
      scene.updateMatrixWorld()
      rendered.scene = scene
      rendered.camera = camera
    }
  }

  return { ...actual, WebGLRenderer: FakeWebGLRenderer }
})

vi.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: vi.fn(),
}))

// requestAnimationFrame を手動で 1 フレームずつ進められるようにする
let frameCallbacks: FrameRequestCallback[] = []
const cancelAnimationFrame = vi.fn()

const nextFrame = () => {
  const callbacks = frameCallbacks
  frameCallbacks = []
  callbacks.forEach((callback) => callback(performance.now()))
}

const findCube = () => (
  rendered.scene?.children.find((child) => (
    child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry
  )) as THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>
)

const findSpheres = () => (
  rendered.scene?.children.filter((child) => (
    child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry
  )) as THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>[]
)

const findCameraHelper = () => (
  rendered.scene?.children.find((child) => child instanceof THREE.CameraHelper) as THREE.CameraHelper
)

describe('CubeComponent', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    frameCallbacks = []
    rendered.scene = null
    rendered.camera = null
    rendered.setSize = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frameCallbacks.push(callback))
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
    wrapper = mount(CubeComponent, { attachTo: document.body })
  })

  afterEach(() => {
    wrapper.unmount()
    vi.unstubAllGlobals()
    cancelAnimationFrame.mockClear()
  })

  it('レンダラのキャンバスを描画領域に追加する', () => {
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('スイッチとリセットボタンを表示する', () => {
    const labels = wrapper.findAll('label').map((label) => label.text())
    expect(labels).toEqual(['ワイヤフレーム表示', 'CameraHelper 表示', 'X軸で回転', 'Y軸で回転', 'Z軸で回転'])
    expect(wrapper.find('button').text()).toBe('ローテーションリセット')
  })

  it('マウント時に 1 フレーム描画し, 次のフレームを予約する', () => {
    expect(rendered.scene).toBeInstanceOf(THREE.Scene)
    expect(rendered.camera).toBeInstanceOf(THREE.PerspectiveCamera)
    expect(frameCallbacks).toHaveLength(1)
  })

  it('キューブを床の上に配置し, 10x10x10 個の球を配置する', () => {
    expect(findCube().position.y).toBe(5)
    expect(findSpheres()).toHaveLength(1000)
  })

  describe('ワイヤフレーム表示', () => {
    it('初期状態ではワイヤフレームで表示する', () => {
      expect(wrapper.find<HTMLInputElement>('#wireframeSwitch').element.checked).toBe(true)
      expect(findCube().material.wireframe).toBe(true)
    })

    it('スイッチを切るとワイヤフレームを解除し, 再び入れると戻す', async () => {
      const wireframeSwitch = wrapper.find('#wireframeSwitch')

      await wireframeSwitch.setValue(false)
      expect(findCube().material.wireframe).toBe(false)

      await wireframeSwitch.setValue(true)
      expect(findCube().material.wireframe).toBe(true)
    })
  })

  describe('CameraHelper 表示', () => {
    it('初期状態では非表示にする', () => {
      expect(wrapper.find<HTMLInputElement>('#cameraHelperSwitch').element.checked).toBe(false)
      expect(findCameraHelper().visible).toBe(false)
    })

    it('スイッチを入れると表示し, 切ると非表示に戻す', async () => {
      const cameraHelperSwitch = wrapper.find('#cameraHelperSwitch')

      await cameraHelperSwitch.setValue(true)
      expect(findCameraHelper().visible).toBe(true)

      await cameraHelperSwitch.setValue(false)
      expect(findCameraHelper().visible).toBe(false)
    })
  })

  describe('回転', () => {
    it('スイッチがすべて切れている間は回転しない', () => {
      nextFrame()
      nextFrame()

      const { x, y, z } = findCube().rotation
      expect([x, y, z]).toEqual([0, 0, 0])
    })

    it.each([{
      id: '#rotateXSwitch', axis: 'x',
    }, {
      id: '#rotateYSwitch', axis: 'y',
    }, {
      id: '#rotateZSwitch', axis: 'z',
    }] as const)('$id を入れると 1 フレームごとに $axis 軸で 0.01 rad 回転する', async ({ id, axis }) => {
      await wrapper.find(id).setValue(true)
      nextFrame()
      nextFrame()

      const rotation = findCube().rotation
      ;(['x', 'y', 'z'] as const).forEach((a) => {
        expect(rotation[a]).toBeCloseTo(a === axis ? 0.02 : 0)
      })
    })

    it('スイッチを切ると回転が止まる', async () => {
      const rotateXSwitch = wrapper.find('#rotateXSwitch')

      await rotateXSwitch.setValue(true)
      nextFrame()
      await rotateXSwitch.setValue(false)
      nextFrame()

      expect(findCube().rotation.x).toBeCloseTo(0.01)
    })

    it('リセットボタンで回転を初期状態に戻す', async () => {
      await wrapper.find('#rotateXSwitch').setValue(true)
      await wrapper.find('#rotateYSwitch').setValue(true)
      await wrapper.find('#rotateZSwitch').setValue(true)
      nextFrame()

      await wrapper.find('button').trigger('click')

      const { x, y, z } = findCube().rotation
      expect([x, y, z]).toEqual([0, 0, 0])
    })
  })

  describe('衝突判定', () => {
    const countByColor = () => {
      const red = new THREE.Color('red')
      const spheres = findSpheres()
      const redCount = spheres.filter((sphere) => sphere.material.color.equals(red)).length
      return { red: redCount, blue: spheres.length - redCount }
    }

    it('キューブ内の球を赤, キューブ外の球を青にする', () => {
      nextFrame()

      // 各軸 10 個中 9 個 (-5 〜 4.6) がキューブ内, 1 個 (5.8) がキューブ外
      expect(countByColor()).toEqual({ red: 9 ** 3, blue: 1000 - 9 ** 3 })
    })

    it('キューブの回転に応じて判定結果が変わる', async () => {
      nextFrame()
      const before = countByColor()

      await wrapper.find('#rotateYSwitch').setValue(true)
      for (let i = 0; i < 50; i++) nextFrame()

      expect(countByColor()).not.toEqual(before)
    })
  })

  it('ウィンドウのリサイズに合わせてカメラとレンダラを更新する', () => {
    window.innerWidth = 800
    window.innerHeight = 400
    window.dispatchEvent(new Event('resize'))

    expect(rendered.camera?.aspect).toBe(2)
    expect(rendered.setSize.at(-1)).toEqual([800, 400])
  })

  it('アンマウント時にアニメーションを停止する', () => {
    wrapper.unmount()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })
})
