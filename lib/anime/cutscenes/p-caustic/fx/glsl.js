// Shared GLSL chunks for the p-caustic FX layer.
// Maths:
//   h21(p)  = fract((q.x+q.y)*q.z), q = fract(p.xyx*.1031) mixed by dot(q, q.yzx+33.33)   (Dave Hoskins hash)
//   vn(p)   = bilinear value noise, smoothstep fade f*f*(3-2f)
//   fbm(p)  = sum_{i<4} 0.5^(i+1) vn(2.03^i p + 7.1 i)
//   gl1(x)  = 1 - smoothstep(w, 2.2w, |fract(x-.5)-.5|), w = .9 fwidth(x): a grid line of CONSTANT PIXEL width
//   BILL    = camera-facing offset: P = centre + right*x*s + up*y*s, right/up = rows of the view matrix
export const NOISE = /* glsl */ `
float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}
float vn3(vec3 p){return mix(vn(p.xy+p.z*7.3),vn(p.yz*1.07+p.x*5.1),.5);}
float gl1(float x){float f=abs(fract(x-.5)-.5);float w=fwidth(x)*.9+1e-4;return 1.-smoothstep(w,w*2.2,f);}
`;
export const BILL = /* glsl */ `
vec3 bill(vec3 c, vec2 q, float s){
  vec3 r=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
  vec3 u=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
  return c + (r*q.x + u*q.y)*s;
}
`;
