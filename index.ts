import SchemaBuilder from '@pothos/core';
import SubGraphPlugin from '@pothos/plugin-sub-graph';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
console.log('hi');

interface SchemaTypes {
  Context: {};
  DefaultFieldNullability: true;
  SubGraphs: 'subgraph1' | 'subgraph2';
}

export const builder = new SchemaBuilder<SchemaTypes>({
  defaultFieldNullability: true,
  plugins: [SubGraphPlugin],
  subGraphs: {
    defaultForTypes: [],
    fieldsInheritFromTypes: true,
  },
});

builder.queryType({ subGraphs: ['subgraph1', 'subgraph2'] });

export interface MyType {
  subtypes: MySubType[];
}

export interface MySubType {
  name: string;
}

export const MySubTypeResponse = builder.objectRef<MySubType>('MySubTypeResponse').implement({
  subGraphs: ['subgraph1'],
  fields: (t) => ({
    name: t.exposeString("name"),
    value: t.int({
      resolve: (value) => 123,
    }),
  })
});

export const MyResponse = builder.objectRef<MyType>('MyTypeResponse').implement({
  subGraphs: ['subgraph1'],
  fields: (t) => ({
    subtypes: t.expose('subtypes', { type: [MySubTypeResponse], description: '' }),
  }),
});

builder.queryField('someField', (t) => {
  return t.field({
    subGraphs: ['subgraph1'],
    type: MyResponse,
    args: {
      id: t.arg({
        type: 'ID',
        required: true,
      }),
    },
    resolve: (parent, { id }, context, info): MyType => {
      //  does not work
      // @ts-expect-error
      info.cacheControl.setCacheHint({ maxAge: 123 });

      return {
        subtypes: [{
          name: 'name'
        }]
      }
    },
  });
});

const schema = builder.toSchema({
  subGraph: ['subgraph1'],
});

const server = new ApolloServer({
  schema,
  plugins: [ApolloServerPluginCacheControl({
    calculateHttpHeaders: true,
  })],
});

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.log(`🚀  Server ready at: ${url}`);
});
